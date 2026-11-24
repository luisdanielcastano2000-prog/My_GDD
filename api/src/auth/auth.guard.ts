import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';

import { User } from '../data/schemas.js';

/**
 * Portero de la API: deja pasar solo las peticiones con un token válido
 * (cabecera «Authorization: Bearer …») y apunta de quién es (req.userId).
 * El token lleva la versión de sesión de la cuenta (tv): si la cuenta ya no existe o su versión
 * subió (cambio de contraseña, «Log out of other devices»), el token deja de valer.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    @InjectModel(User.name) private readonly users: Model<User>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; userId?: string }>();
    const [type, token] = (req.headers['authorization'] ?? '').split(' ');
    if (type !== 'Bearer' || !token) throw new UnauthorizedException('Log in to continue.');
    let payload: { sub: string; tv?: number };
    try {
      payload = await this.jwt.verifyAsync<{ sub: string; tv?: number }>(token);
    } catch {
      throw new UnauthorizedException('Your session has expired. Log in again.');
    }
    const u = await this.users.findById(payload.sub, { tv: 1 }).lean();
    if (!u || (u.tv ?? 0) !== (payload.tv ?? 0)) throw new UnauthorizedException('Your session has expired. Log in again.');
    req.userId = payload.sub;
    return true;
  }
}

/** Id de la cuenta que hace la petición (lo pone el AuthGuard). */
export const UserId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => ctx.switchToHttp().getRequest<{ userId: string }>().userId);
