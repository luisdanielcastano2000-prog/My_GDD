// La API de los datos. Todas las rutas piden token (AuthGuard).
// - Lo tuyo (perfil, equipo, notas) solo lo tocas tú.
// - Un GDD lo ve su dueño y las personas que ACEPTARON entrar en su equipo:
//   Editor = puede escribir; Viewer = solo leer (y enviar notas). Reglas en team.ts.
import { BadRequestException, Body, ConflictException, Controller, Delete, ForbiddenException, Get, HttpCode, NotFoundException, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import bcrypt from 'bcryptjs';
import { IsArray, IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { Model } from 'mongoose';

import { AuthGuard, UserId } from '../auth/auth.guard.js';
import { PasswordDto, ProfileDto } from '../auth/dto.js';
import { Feedback, Gdd, Note, User } from './schemas.js';
import { type Member, type Team, cleanTeam, markOutOfDate, recipients, roleIn } from './team.js';

class GddDto {
  @IsString() @MinLength(1, { message: 'Enter a project name.' }) @MaxLength(120) name: string;
  @IsOptional() @IsString() desc?: string;
  @IsOptional() @IsString() updated?: string;
  @IsOptional() @IsNumber() cts?: number; // cuándo se creó (ms)
  @IsOptional() @IsNumber() uts?: number; // cuándo cambió por última vez (ms)
  @IsOptional() @IsNumber() rev?: number; // versión sobre la que se hizo el cambio (ver save)
  @IsNumber() order: number;
  @IsArray() depts: Record<string, unknown>[];
  @IsOptional() @IsObject() last?: Record<string, unknown> | null;
}
class NoteDto {
  @IsIn(['received', 'sent']) box: 'received' | 'sent';
  @IsObject() data: Record<string, unknown>;
}
class FeedbackDto {
  @IsIn(['Idea', 'Problem', 'Question']) topic: string;
  @IsString() @MinLength(1, { message: 'Write your message before sending it.' }) @MaxLength(5000) text: string;
  @IsOptional() @IsBoolean() reply?: boolean;
}
class TeamDto {
  @IsArray() members: Record<string, unknown>[];
  @IsArray() invites: Record<string, unknown>[];
}

const PROFILE = ['name', 'user', 'email', 'av', 'phone', 'country', 'tz', 'lang', 'theme', 'accent'] as const;
const teamOf = (u: { team?: unknown } | null | undefined): Team => (u?.team as Team | undefined) ?? { members: [], invites: [] };
type GddLean = Gdd & { _id: string };
/** Un GDD tal como lo usa el front (sin owner ni order; con share si es de otra persona). */
const toFront = ({ _id, owner: _o, order: _r, ...g }: GddLean, share?: { owner: string; name: string; role: string }): Record<string, unknown> => ({ id: _id, ...g, ...(share ? { share } : {}) });

@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(Gdd.name) private readonly gdds: Model<Gdd>,
    @InjectModel(Note.name) private readonly notes: Model<Note>,
    @InjectModel(Feedback.name) private readonly feedback: Model<Feedback>,
    private readonly jwt: JwtService,
  ) {}

  /** Nuevo token para ESTE aparato tras subir la versión de sesión (los demás quedan fuera). */
  private async bump(id: string): Promise<string> {
    const u = await this.users.findByIdAndUpdate(id, { $inc: { tv: 1 } }, { new: true, projection: { tv: 1 } }).lean();
    return this.jwt.signAsync({ sub: id, tv: u?.tv ?? 0 });
  }

  /**
   * Todo lo que necesita el front al entrar: perfil, equipo, GDDs (los tuyos y los de los equipos
   * en los que estás), notas, invitaciones que esperan respuesta y equipos en los que estás.
   */
  @Get()
  async all(@UserId() id: string): Promise<unknown> {
    const u = await this.users.findById(id).lean();
    if (!u) throw new NotFoundException('This account no longer exists.');
    const [own, notes, owners, inviters] = await Promise.all([
      this.gdds.find({ owner: id }).sort({ order: 1 }).lean<GddLean[]>(),
      this.notes.find({ owner: id }).lean(),
      this.users.find({ 'team.members.uid': id }, { name: 1, team: 1 }).lean(),
      this.users.find({ 'team.invites.email': u.email, _id: { $ne: id } }, { name: 1, team: 1 }).lean(),
    ]);
    const teams = owners.map((o) => ({ owner: String(o._id), name: o.name, role: roleIn(String(o._id), teamOf(o), id) ?? 'Viewer' }));
    const shared = teams.length ? await this.gdds.find({ owner: { $in: teams.map((t) => t.owner) } }).sort({ order: 1 }).lean<GddLean[]>() : [];
    const gdds = [...own.map((g) => toFront(g)), ...shared.map((g) => toFront(g, teams.find((t) => t.owner === g.owner)))];
    const seen = new Set(gdds.map((g) => g['id']));
    const user = Object.fromEntries(PROFILE.map((k) => [k, u[k]]));
    return {
      user,
      settings: u.settings ?? {},
      team: teamOf(u),
      gdds,
      // Una nota de un GDD al que ya no tienes acceso se queda, pero sin enlace al GDD
      notes: notes.filter((n) => n.box === 'received').map((n) => ({ ...n.data, ...(n.data['g'] && !seen.has(n.data['g'] as string) ? { g: null } : {}), id: n._id })),
      sent: notes.filter((n) => n.box === 'sent').map((n) => ({ ...n.data, id: n._id })),
      since: (u as { createdAt?: Date }).createdAt,
      teams,
      invitations: inviters.flatMap((o) => teamOf(o).invites.filter((v) => v.email === u.email).map((v) => ({ owner: String(o._id), name: o.name, role: v.role }))),
    };
  }

  @Patch()
  async profile(@UserId() id: string, @Body() dto: ProfileDto): Promise<{ ok: true }> {
    if (dto.email) {
      const email = dto.email.trim().toLowerCase();
      if (await this.users.exists({ email, _id: { $ne: id } })) throw new BadRequestException('This email already has an account.');
      dto.email = email;
    }
    await this.users.updateOne({ _id: id }, { $set: dto });
    // En los equipos donde estás, tu nombre y email se ven actualizados
    const set: Record<string, string> = {};
    if (dto.name) set['team.members.$[m].name'] = dto.name;
    if (dto.email) set['team.members.$[m].email'] = dto.email;
    if (Object.keys(set).length) await this.users.updateMany({ 'team.members.uid': id }, { $set: set }, { arrayFilters: [{ 'm.uid': id }] });
    return { ok: true };
  }

  @Patch('password')
  async password(@UserId() id: string, @Body() dto: PasswordDto): Promise<{ ok: true; token: string }> {
    const u = await this.users.findById(id);
    if (!u || !(await bcrypt.compare(dto.current, u.passwordHash))) throw new BadRequestException('The current password is incorrect.');
    u.passwordHash = await bcrypt.hash(dto.next, 10);
    await u.save();
    return { ok: true, token: await this.bump(id) }; // las sesiones de otros aparatos se cierran
  }

  /** «Log out of other devices»: los tokens anteriores dejan de valer; este aparato recibe uno nuevo. */
  @Post('logout-others')
  @HttpCode(200)
  async logoutOthers(@UserId() id: string): Promise<{ token: string }> {
    return { token: await this.bump(id) };
  }

  /** «Send feedback»: se guarda en la colección feedback (se lee en Atlas). */
  @Post('feedback')
  @HttpCode(201)
  async sendFeedback(@UserId() id: string, @Body() dto: FeedbackDto): Promise<{ ok: true }> {
    const u = await this.users.findById(id, { email: 1 }).lean();
    await this.feedback.create({ owner: id, email: u?.email ?? '', topic: dto.topic, text: dto.text, reply: dto.reply ?? true });
    return { ok: true };
  }

  /** Guarda «My team»: quitar personas, cambiar roles, invitar y cancelar invitaciones (ver cleanTeam). */
  @Put('team')
  async team(@UserId() id: string, @Body() dto: TeamDto): Promise<{ ok: true; team: Team }> {
    const u = await this.users.findById(id, { team: 1, email: 1 }).lean();
    if (!u) throw new NotFoundException('This account no longer exists.');
    const team = cleanTeam(teamOf(u), dto, u.email);
    await this.users.updateOne({ _id: id }, { $set: { team } });
    return { ok: true, team };
  }

  /** Borra la cuenta y TODOS sus datos (y la saca de los equipos en los que estaba). */
  @Delete()
  async remove(@UserId() id: string): Promise<{ ok: true }> {
    await Promise.all([
      this.gdds.deleteMany({ owner: id }),
      this.notes.deleteMany({ owner: id }),
      this.feedback.deleteMany({ owner: id }),
      this.users.updateMany({ 'team.members.uid': id }, { $pull: { 'team.members': { uid: id } } }),
      this.users.deleteOne({ _id: id }),
    ]);
    return { ok: true };
  }
}

/** Responder a una invitación y salir de un equipo. :owner = id de la cuenta dueña del equipo. */
@Controller('teams')
@UseGuards(AuthGuard)
export class TeamsController {
  constructor(@InjectModel(User.name) private readonly users: Model<User>) {}

  @Post(':owner/accept')
  @HttpCode(200)
  async accept(@UserId() id: string, @Param('owner') owner: string): Promise<{ ok: true }> {
    const me = await this.users.findById(id, { name: 1, email: 1 }).lean();
    const o = owner === id ? null : await this.users.findById(owner, { team: 1 }).lean().catch(() => null);
    const inv = o ? teamOf(o).invites.find((v) => v.email === me?.email) : undefined;
    if (!me || !o || !inv) throw new NotFoundException('This invitation is no longer available.');
    const member: Member = { id, uid: id, name: me.name, email: me.email, dept: '', role: inv.role };
    // Quita la invitación y, si aún no está, añade a la persona (en una sola operación)
    await this.users.updateOne({ _id: owner, 'team.members.uid': { $ne: id } }, { $pull: { 'team.invites': { email: me.email } }, $push: { 'team.members': member } });
    await this.users.updateOne({ _id: owner }, { $pull: { 'team.invites': { email: me.email } } });
    return { ok: true };
  }

  @Post(':owner/decline')
  @HttpCode(200)
  async decline(@UserId() id: string, @Param('owner') owner: string): Promise<{ ok: true }> {
    const me = await this.users.findById(id, { email: 1 }).lean();
    if (me) await this.users.updateOne({ _id: owner }, { $pull: { 'team.invites': { email: me.email } } }).catch(() => null);
    return { ok: true };
  }

  @Post(':owner/leave')
  @HttpCode(200)
  async leave(@UserId() id: string, @Param('owner') owner: string): Promise<{ ok: true }> {
    await this.users.updateOne({ _id: owner }, { $pull: { 'team.members': { uid: id } } }).catch(() => null);
    return { ok: true };
  }
}

@Controller('gdds')
@UseGuards(AuthGuard)
export class GddsController {
  constructor(
    @InjectModel(Gdd.name) private readonly gdds: Model<Gdd>,
    @InjectModel(User.name) private readonly users: Model<User>,
  ) {}

  /**
   * Crea o sustituye un GDD entero (el front lo guarda cada vez que cambia).
   * Cada GDD lleva una versión (rev) que sube en cada guardado. El front envía la versión sobre la
   * que hizo su cambio: si otra persona guardó entre medias, responde 409 con el GDD actual y el
   * front junta los dos cambios bloque a bloque antes de volver a guardar. Así nadie pisa a nadie.
   */
  @Put(':id')
  async save(@UserId() uid: string, @Param('id') id: string, @Body() dto: GddDto): Promise<{ ok: true; rev: number }> {
    const cur = await this.gdds.findById(id).lean<GddLean>();
    const content = { desc: dto.desc, updated: dto.updated, uts: dto.uts, depts: dto.depts, last: dto.last ?? null };
    if (!cur) {
      await this.gdds.create({ _id: id, owner: uid, name: dto.name, cts: dto.cts, order: dto.order, rev: 1, ...content });
      return { ok: true, rev: 1 };
    }
    const role = cur.owner === uid ? 'Owner' : roleIn(cur.owner, teamOf(await this.users.findById(cur.owner, { team: 1 }).lean()), uid);
    if (!role) throw new NotFoundException('GDD not found.');
    if (role === 'Viewer') throw new ForbiddenException('You can only read this GDD.');
    const rev = cur.rev ?? 0;
    if (dto.rev !== undefined && dto.rev !== rev) throw new ConflictException({ message: 'Someone else changed this GDD.', gdd: toFront(cur) });
    // El nombre, la fecha de creación y el orden en Home solo los cambia el dueño
    const set = role === 'Owner' ? { ...content, name: dto.name, cts: dto.cts, order: dto.order } : content;
    const r = await this.gdds.updateOne({ _id: id, rev: cur.rev === undefined ? { $exists: false } : cur.rev }, { $set: { ...set, rev: rev + 1 } });
    if (!r.matchedCount) { // otra persona guardó justo ahora
      const now = await this.gdds.findById(id).lean<GddLean>();
      throw new ConflictException({ message: 'Someone else changed this GDD.', gdd: now ? toFront(now) : null });
    }
    return { ok: true, rev: rev + 1 };
  }

  /** Borrar un GDD: solo su dueño. */
  @Delete(':id')
  async remove(@UserId() owner: string, @Param('id') id: string): Promise<{ ok: true }> {
    const r = await this.gdds.deleteOne({ _id: id, owner });
    if (r.deletedCount) await this.gdds.db.collection('notes').deleteMany({ owner, 'data.g': id });
    return { ok: true };
  }
}

@Controller('notes')
@UseGuards(AuthGuard)
export class NotesController {
  constructor(
    @InjectModel(Note.name) private readonly notes: Model<Note>,
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(Gdd.name) private readonly gdds: Model<Gdd>,
  ) {}

  /**
   * Crea o sustituye una nota. Si es una nota ENVIADA nueva, se entrega al equipo: el del GDD de la
   * nota (su dueño y sus miembros) o, sin GDD, el tuyo. Solo a quien aceptó estar en ese equipo.
   */
  @Put(':id')
  async save(@UserId() owner: string, @Param('id') id: string, @Body() dto: NoteDto): Promise<{ ok: true; delivered: number }> {
    const cur = await this.notes.findById(id).lean();
    if (cur && cur.owner !== owner) throw new NotFoundException('Note not found.');
    const data = { ...dto.data };
    delete data['id'];
    await this.notes.updateOne({ _id: id }, { $set: { owner, box: dto.box, data } }, { upsert: true });
    let delivered = 0;
    if (!cur && dto.box === 'sent') delivered = await this.deliver(owner, id, data);
    return { ok: true, delivered };
  }

  @Post('read')
  @HttpCode(200)
  async readAll(@UserId() owner: string): Promise<{ ok: true }> {
    await this.notes.updateMany({ owner, box: 'received' }, { $set: { 'data.unread': false } });
    return { ok: true };
  }

  @Delete(':id')
  async remove(@UserId() owner: string, @Param('id') id: string): Promise<{ ok: true }> {
    await this.notes.deleteOne({ _id: id, owner });
    return { ok: true };
  }

  private async deliver(sender: string, id: string, data: Record<string, unknown>): Promise<number> {
    const me = await this.users.findById(sender, { name: 1 }).lean();
    if (!me) return 0;
    // ¿De qué equipo es la nota? Del dueño del GDD (si tienes acceso a él) o del tuyo.
    const g = typeof data['g'] === 'string' ? await this.gdds.findById(data['g'], { owner: 1 }).lean() : null;
    let teamOwner = sender;
    if (g && g.owner !== sender) {
      const o = await this.users.findById(g.owner, { team: 1 }).lean();
      if (roleIn(g.owner, teamOf(o), sender)) teamOwner = g.owner;
    }
    const gid = g && teamOwner === g.owner ? String(data['g']) : null;
    // «Out of date»: los bloques afectados se marcan en el GDD, para todo el equipo
    const aff = gid && Array.isArray(data['aff']) ? data['aff'].filter((x): x is string => typeof x === 'string').slice(0, 500) : [];
    const marked = aff.length && gid ? await this.markBlocks(gid, aff) : [];
    const o = await this.users.findById(teamOwner, { team: 1 }).lean();
    const to = recipients(teamOwner, teamOf(o), sender);
    if (!to.length) return 0;
    const text = typeof data['text'] === 'string' ? data['text'] : '';
    const where = await this.where(gid, data);
    const base = { g: gid, dp: typeof data['dp'] === 'string' ? data['dp'] : undefined, b: typeof data['b'] === 'string' ? data['b'] : undefined, by: me.name, when: 'Just now', ts: Date.now(), unread: true };
    await this.notes.insertMany(
      to.map((uid) => ({
        _id: id + '-' + uid,
        owner: uid,
        box: 'received',
        // Con bloques marcados llega como aviso de cambio (abre «Review»); si no, como nota del equipo
        data: marked.length
          ? { ...base, kind: 'change', title: '“' + text + '”', path: where || 'From: ' + me.name, aff: marked, rvd: [] }
          : { ...base, kind: 'team', title: '“' + text + '”', path: 'From: ' + me.name },
      })),
    );
    return to.length;
  }

  /** Marca bloques como «Out of date» en un GDD (con su versión, reintentando si otra persona guardó a la vez). */
  private async markBlocks(gid: string, aff: string[]): Promise<string[]> {
    for (let i = 0; i < 5; i++) {
      const doc = await this.gdds.findById(gid).lean<GddLean>();
      if (!doc) return [];
      const { depts, marked } = markOutOfDate(doc.depts, aff);
      if (!marked.length) return [];
      const rev = doc.rev ?? 0;
      const r = await this.gdds.updateOne({ _id: gid, rev: doc.rev === undefined ? { $exists: false } : doc.rev }, { $set: { depts, rev: rev + 1, uts: Date.now(), updated: 'Updated today' } });
      if (r.matchedCount) return marked;
    }
    return [];
  }

  /** «Animation › Blockings»: de dónde sale la nota (para el aviso de cambio). */
  private async where(gid: string | null, data: Record<string, unknown>): Promise<string> {
    if (!gid) return '';
    const doc = await this.gdds.findById(gid, { depts: 1 }).lean<GddLean>();
    const dp = doc?.depts.find((d) => d['id'] === data['dp']);
    const b = dp && Array.isArray(dp['blocks']) ? (dp['blocks'] as Record<string, unknown>[]).find((x) => x['id'] === data['b']) : undefined;
    return [dp?.['name'], b?.['name']].filter((x): x is string => typeof x === 'string').join(' › ');
  }
}
