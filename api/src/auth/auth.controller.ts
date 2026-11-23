import { Body, ConflictException, Controller, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import bcrypt from 'bcryptjs';
import type { Model } from 'mongoose';

import { User } from '../data/schemas.js';
import { LoginDto, SignupDto } from './dto.js';

/** Crear cuenta y entrar. Devuelven un token que el front envía en cada petición. */
@Controller('auth')
export class AuthController {
  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly jwt: JwtService,
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
    return { token: await this.jwt.signAsync({ sub: String(doc._id) }) };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto): Promise<{ token: string }> {
    const doc = await this.users.findOne({ email: dto.email.trim().toLowerCase() });
    // Mismo mensaje si falla el email o la contraseña: no dice qué cuentas existen.
    if (!doc || !(await bcrypt.compare(dto.password, doc.passwordHash))) throw new UnauthorizedException('The email or password is incorrect.');
    return { token: await this.jwt.signAsync({ sub: String(doc._id) }) };
  }
}
