import { BadRequestException, Body, ConflictException, Controller, HttpCode, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import bcrypt from 'bcryptjs';
import type { Model } from 'mongoose';

import { User } from '../data/schemas.js';
import { MailService } from '../mail/mail.service.js';
import { codeMail, passwordChangedMail, resetMail, verifyMail } from '../mail/templates.js';
import { trust, trusted } from './devices.js';
import { CodeDto, EmailDto, LoginDto, ResetDto, SignupDto, TokenDto } from './dto.js';
import { IpThrottlerGuard } from './ip-throttler.guard.js';

/** Crear cuenta y entrar. Devuelven un token que el front envía en cada petición. */
@Controller('auth')
@UseGuards(IpThrottlerGuard)
export class AuthController {
  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  @Post('signup')
  async signup(@Body() dto: SignupDto): Promise<{ token: string }> {
    const email = dto.email.trim().toLowerCase();
    if (await this.users.exists({ email })) throw new ConflictException('This email already has an account.');
    const u = dto.user.trim();
    const name = u.charAt(0).toUpperCase() + u.slice(1);
    const doc = await this.users.create({
      email,
      passwordHash: await bcrypt.hash(dto.password, 10),
      name,
      user: u.toLowerCase(),
      team: { members: [{ id: 'me', name, email, dept: '', role: 'Owner', you: true }], invites: [] },
    });
    // Correo de bienvenida con el enlace para verificar el email (48 h)
    await this.mail.send(email, verifyMail(name, this.mail.link('/verify', await this.mail.newToken(String(doc._id), 'verify', 48))));
    return { token: await this.jwt.signAsync({ sub: String(doc._id), tv: doc.tv ?? 0 }) };
  }

  /** Enlace de los correos: verificar la cuenta o confirmar un email nuevo. */
  @Post('verify')
  @HttpCode(200)
  async verify(@Body() dto: TokenDto): Promise<{ ok: true; kind: string; email: string }> {
    const t = await this.mail.useToken(dto.token, ['verify', 'email']);
    if (!t) throw new BadRequestException('This link has expired or was already used.');
    const u = await this.users.findById(t.uid);
    if (!u) throw new BadRequestException('This account no longer exists.');
    if (t.kind === 'email' && t.email) {
      if (await this.users.exists({ email: t.email, _id: { $ne: u._id } })) throw new BadRequestException('This email already has an account.');
      u.email = t.email;
      // En los equipos donde está, su email se ve actualizado; y su propia ficha en su equipo
      await this.users.updateMany({ 'team.members.uid': t.uid }, { $set: { 'team.members.$[m].email': t.email } }, { arrayFilters: [{ 'm.uid': t.uid }] });
      await this.users.updateOne({ _id: t.uid }, { $set: { 'team.members.$[m].email': t.email } }, { arrayFilters: [{ 'm.you': true }] });
    }
    u.emailVerified = true; // abrir un enlace enviado a ese email también lo verifica
    await u.save();
    return { ok: true, kind: t.kind, email: u.email };
  }

  /** «Forgot password?»: manda un enlace para crear una contraseña nueva (1 h). Responde igual exista o no la cuenta. */
  @Post('forgot')
  @HttpCode(200)
  async forgot(@Body() dto: EmailDto): Promise<{ ok: true; mail: boolean }> {
    const u = await this.users.findOne({ email: dto.email.trim().toLowerCase() }, { _id: 1 }).lean();
    if (u && this.mail.enabled) await this.mail.send(dto.email.trim().toLowerCase(), resetMail(this.mail.link('/reset', await this.mail.newToken(String(u._id), 'reset', 1))));
    return { ok: true, mail: this.mail.enabled };
  }

  /** Crear la contraseña nueva con el enlace: cierra todas las sesiones y avisa por correo. */
  @Post('reset')
  @HttpCode(200)
  async reset(@Body() dto: ResetDto): Promise<{ ok: true }> {
    const t = await this.mail.useToken(dto.token, ['reset']);
    if (!t) throw new BadRequestException('This link has expired or was already used.');
    const u = await this.users.findById(t.uid);
    if (!u) throw new BadRequestException('This account no longer exists.');
    u.passwordHash = await bcrypt.hash(dto.password, 10);
    u.tv = (u.tv ?? 0) + 1; // fuera de todos los aparatos
    u.devices = []; // y ninguno queda de confianza: con dos pasos, todos piden código otra vez
    u.emailVerified = true; // el enlace llegó a su email
    await u.save();
    await this.mail.send(u.email, passwordChangedMail(u.name));
    return { ok: true };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto): Promise<{ token: string } | { twoStep: true; ticket: string }> {
    const doc = await this.users.findOne({ email: dto.email.trim().toLowerCase() });
    // Mismo mensaje si falla el email o la contraseña: no dice qué cuentas existen.
    if (!doc || !(await bcrypt.compare(dto.password, doc.passwordHash))) throw new UnauthorizedException('The email or password is incorrect.');
    // Dos pasos: desde un aparato nuevo, la contraseña no basta; se manda un código al email.
    // Sin correo (modo 'off') no se puede mandar: se entra como antes (el interruptor tampoco se puede activar).
    if (doc.twoStep && this.mail.enabled && !trusted(doc.devices, dto.device)) {
      const { ticket, code } = await this.mail.newCode(String(doc._id));
      await this.mail.send(doc.email, codeMail(doc.name, code));
      return { twoStep: true, ticket };
    }
    return { token: await this.jwt.signAsync({ sub: String(doc._id), tv: doc.tv ?? 0 }) };
  }

  /** Segundo paso: el código del correo. Si vale, este navegador queda de confianza. */
  @Post('login/code')
  @HttpCode(200)
  async loginCode(@Body() dto: CodeDto): Promise<{ token: string }> {
    const c = await this.mail.useCode(dto.ticket, dto.code);
    if (c.r !== 'ok') {
      if (c.r === 'bad') throw new UnauthorizedException('That code isn’t right. Check the email and try again.');
      throw new BadRequestException('This code has expired. Send a new one.');
    }
    const u = await this.users.findById(c.uid);
    if (!u) throw new BadRequestException('This account no longer exists.');
    u.devices = trust(u.devices, dto.device);
    await u.save();
    return { token: await this.jwt.signAsync({ sub: String(u._id), tv: u.tv ?? 0 }) };
  }
}
