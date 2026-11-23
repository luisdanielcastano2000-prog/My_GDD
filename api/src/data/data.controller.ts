// La API de los datos de cada cuenta. Todas las rutas piden token (AuthGuard) y solo tocan
// los documentos de esa cuenta (owner = id de la cuenta).
import { BadRequestException, Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import bcrypt from 'bcryptjs';
import { IsArray, IsIn, IsNumber, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { Model } from 'mongoose';

import { AuthGuard, UserId } from '../auth/auth.guard.js';
import { PasswordDto, ProfileDto } from '../auth/dto.js';
import { Gdd, Note, User } from './schemas.js';

class GddDto {
  @IsString() @MinLength(1, { message: 'Enter a project name.' }) @MaxLength(120) name: string;
  @IsOptional() @IsString() desc?: string;
  @IsOptional() @IsString() updated?: string;
  @IsNumber() order: number;
  @IsArray() depts: Record<string, unknown>[];
  @IsOptional() @IsObject() last?: Record<string, unknown> | null;
}
class NoteDto {
  @IsIn(['received', 'sent']) box: 'received' | 'sent';
  @IsObject() data: Record<string, unknown>;
}
class TeamDto {
  @IsArray() members: Record<string, unknown>[];
  @IsArray() invites: Record<string, unknown>[];
}

const PROFILE = ['name', 'user', 'email', 'av', 'phone', 'country', 'tz', 'lang', 'theme', 'accent'] as const;

@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(Gdd.name) private readonly gdds: Model<Gdd>,
    @InjectModel(Note.name) private readonly notes: Model<Note>,
  ) {}

  /** Todo lo que necesita el front al entrar: perfil, equipo, GDDs y notas. */
  @Get()
  async all(@UserId() id: string): Promise<unknown> {
    const u = await this.users.findById(id).lean();
    if (!u) throw new NotFoundException('This account no longer exists.');
    const [gdds, notes] = await Promise.all([this.gdds.find({ owner: id }).sort({ order: 1 }).lean(), this.notes.find({ owner: id }).lean()]);
    const user = Object.fromEntries(PROFILE.map((k) => [k, u[k]]));
    return {
      user,
      settings: u.settings ?? {},
      team: u.team,
      gdds: gdds.map(({ _id, owner: _o, order: _r, ...g }) => ({ id: _id, ...g })),
      notes: notes.filter((n) => n.box === 'received').map((n) => ({ ...n.data, id: n._id })),
      sent: notes.filter((n) => n.box === 'sent').map((n) => ({ ...n.data, id: n._id })),
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
    return { ok: true };
  }

  @Patch('password')
  async password(@UserId() id: string, @Body() dto: PasswordDto): Promise<{ ok: true }> {
    const u = await this.users.findById(id);
    if (!u || !(await bcrypt.compare(dto.current, u.passwordHash))) throw new BadRequestException('The current password is incorrect.');
    u.passwordHash = await bcrypt.hash(dto.next, 10);
    await u.save();
    return { ok: true };
  }

  @Put('team')
  async team(@UserId() id: string, @Body() dto: TeamDto): Promise<{ ok: true }> {
    await this.users.updateOne({ _id: id }, { $set: { team: { members: dto.members, invites: dto.invites } } });
    return { ok: true };
  }

  /** Borra la cuenta y TODOS sus datos. */
  @Delete()
  async remove(@UserId() id: string): Promise<{ ok: true }> {
    await Promise.all([this.gdds.deleteMany({ owner: id }), this.notes.deleteMany({ owner: id }), this.users.deleteOne({ _id: id })]);
    return { ok: true };
  }
}

@Controller('gdds')
@UseGuards(AuthGuard)
export class GddsController {
  constructor(@InjectModel(Gdd.name) private readonly gdds: Model<Gdd>) {}

  /** Crea o sustituye un GDD entero (el front lo guarda cada vez que cambia). */
  @Put(':id')
  async save(@UserId() owner: string, @Param('id') id: string, @Body() dto: GddDto): Promise<{ ok: true }> {
    const cur = await this.gdds.findById(id).lean();
    if (cur && cur.owner !== owner) throw new NotFoundException('GDD not found.');
    await this.gdds.updateOne({ _id: id }, { $set: { name: dto.name, desc: dto.desc, updated: dto.updated, order: dto.order, depts: dto.depts, last: dto.last ?? null, owner } }, { upsert: true });
    return { ok: true };
  }

  @Delete(':id')
  async remove(@UserId() owner: string, @Param('id') id: string): Promise<{ ok: true }> {
    await this.gdds.deleteOne({ _id: id, owner });
    await this.gdds.db.collection('notes').deleteMany({ owner, 'data.g': id });
    return { ok: true };
  }
}

@Controller('notes')
@UseGuards(AuthGuard)
export class NotesController {
  constructor(
    @InjectModel(Note.name) private readonly notes: Model<Note>,
    @InjectModel(User.name) private readonly users: Model<User>,
  ) {}

  /**
   * Crea o sustituye una nota. Si es una nota ENVIADA nueva, se entrega a las personas del equipo
   * que tienen cuenta en My GDD (por su email): les llega como nota recibida «del equipo».
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

  private async deliver(owner: string, id: string, data: Record<string, unknown>): Promise<number> {
    const me = await this.users.findById(owner).lean();
    if (!me) return 0;
    const emails = [...(me.team?.members ?? []).filter((m) => !m['you']), ...(me.team?.invites ?? [])]
      .map((m) => (typeof m['email'] === 'string' ? m['email'] : '').toLowerCase())
      .filter(Boolean);
    if (!emails.length) return 0;
    const to = await this.users.find({ email: { $in: emails }, _id: { $ne: owner } }, { _id: 1 }).lean();
    await this.notes.insertMany(
      to.map((u) => ({
        _id: id + '-' + String(u._id),
        owner: String(u._id),
        box: 'received',
        data: { kind: 'team', g: null, title: '“' + (typeof data['text'] === 'string' ? data['text'] : '') + '”', path: 'From: ' + me.name, by: me.name, when: 'Just now', ts: Date.now(), unread: true },
      })),
    );
    return to.length;
  }
}
