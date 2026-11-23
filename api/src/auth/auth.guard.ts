import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * Portero de la API: deja pasar solo las peticiones con un token válido
 * (cabecera «Authorization: Bearer …») y apunta de quién es (req.userId).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; userId?: string }>();
    const [type, token] = (req.headers['authorization'] ?? '').split(' ');
    if (type !== 'Bearer' || !token) throw new UnauthorizedException('Log in to continue.');
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      req.userId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException('Your session has expired. Log in again.');
    }
  }
}

/** Id de la cuenta que hace la petición (lo pone el AuthGuard). */
export const UserId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => ctx.switchToHttp().getRequest<{ userId: string }>().userId);
