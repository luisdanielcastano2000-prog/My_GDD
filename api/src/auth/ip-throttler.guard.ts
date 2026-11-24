import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Límite de intentos por visitante. En Render la petición pasa por Cloudflare y varios proxies,
 * así que req.ip cambia en cada petición; Cloudflare pone la IP real en «CF-Connecting-IP»
 * (y sustituye la que mande el visitante). En el Mac no hay Cloudflare: se usa req.ip.
 */
@Injectable()
export class IpThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    const h = (req['headers'] ?? {}) as Record<string, string | string[] | undefined>;
    const cf = h['cf-connecting-ip'];
    const ip = typeof req['ip'] === 'string' ? req['ip'] : '';
    return (Array.isArray(cf) ? cf[0] : cf) ?? ip;
  }
}
