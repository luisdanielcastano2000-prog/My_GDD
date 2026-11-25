// Envío de correos con Brevo (https://www.brevo.com), por su API HTTP (sin librerías).
//
// Variables de entorno (en Render, *Environment*; nunca en el código ni en el chat):
// - BREVO_API_KEY: la clave de la API de Brevo.
// - MAIL_FROM: el email remitente, verificado en Brevo (Senders). MAIL_FROM_NAME: el nombre (por defecto «My GDD»).
// - APP_URL: la dirección de la app para los enlaces (por defecto https://my-gdd.onrender.com en producción
//   y http://localhost:3000 en el Mac). Nunca se saca de la petición (alguien podría falsear el Host).
//
// Modos:
// - 'brevo'  : hay clave → se envía de verdad.
// - 'outbox' : sin clave y fuera de producción (Mac, pruebas) → se guarda en la colección outbox.
// - 'off'    : sin clave en producción → no se envía nada y no se pide verificar el email.
import { createHash, randomBytes, randomInt } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';

import { MailToken, Outbox } from '../data/schemas.js';
import type { Mail } from './templates.js';

export type MailMode = 'brevo' | 'outbox' | 'off';
export const sha256 = (s: string): string => createHash('sha256').update(s).digest('hex');

@Injectable()
export class MailService {
  private readonly log = new Logger('Mail');
  readonly mode: MailMode = process.env.BREVO_API_KEY ? 'brevo' : process.env.NODE_ENV === 'production' ? 'off' : 'outbox';
  readonly appUrl = (process.env.APP_URL ?? (process.env.NODE_ENV === 'production' ? 'https://my-gdd.onrender.com' : 'http://localhost:3000')).replace(/\/$/, '');

  constructor(
    @InjectModel(MailToken.name) private readonly tokens: Model<MailToken>,
    @InjectModel(Outbox.name) private readonly outbox: Model<Outbox>,
  ) {}

  /** ¿Hay correo? (si no, la app funciona como antes: sin verificar emails). */
  get enabled(): boolean {
    return this.mode !== 'off';
  }

  /** Envía un correo. Devuelve false si no se pudo (nunca lanza: el correo no debe romper la acción). */
  async send(to: string, mail: Mail): Promise<boolean> {
    if (this.mode === 'off') return false;
    // example.com es un dominio reservado (RFC 2606): son cuentas de prueba. No se envía (rebotaría y Brevo penaliza la cuenta)
    if (this.mode === 'brevo' && /@example\.(com|org|net)$/i.test(to)) return true;
    if (this.mode === 'outbox') {
      await this.outbox.create({ to, subject: mail.subject, text: mail.text, link: mail.link });
      return true;
    }
    try {
      const r = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': process.env.BREVO_API_KEY ?? '', 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ sender: { email: process.env.MAIL_FROM, name: process.env.MAIL_FROM_NAME ?? 'My GDD' }, to: [{ email: to }], subject: mail.subject, textContent: mail.text, htmlContent: mail.html }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!r.ok) { this.log.warn(`Brevo respondió ${r.status} al enviar «${mail.subject}»`); return false; }
      return true;
    } catch (e) {
      this.log.warn(`No se pudo enviar «${mail.subject}»: ${(e as Error).message}`);
      return false;
    }
  }

  /** Crea un enlace de un solo uso (borra los anteriores del mismo tipo). Devuelve el token en claro. */
  async newToken(uid: string, kind: 'verify' | 'reset' | 'email', hours: number, email?: string): Promise<string> {
    await this.tokens.deleteMany({ uid, kind });
    const token = randomBytes(32).toString('base64url');
    await this.tokens.create({ _id: sha256(token), uid, kind, email, exp: new Date(Date.now() + hours * 3_600_000) });
    return token;
  }

  /** Usa un enlace: lo devuelve (y lo borra) si existe, es de ese tipo y no ha caducado. */
  async useToken(token: string, kinds: string[]): Promise<{ uid: string; kind: string; email?: string } | null> {
    const t = await this.tokens.findOneAndDelete({ _id: sha256(String(token)), kind: { $in: kinds }, exp: { $gt: new Date() } }).lean();
    return t ? { uid: t.uid, kind: t.kind, email: t.email } : null;
  }

  /**
   * Código para entrar en dos pasos (10 min). Devuelve el código (va en el correo) y el «ticket»
   * que guarda el front para enviarlo con el código. Se guardan solo sus sha256.
   */
  async newCode(uid: string): Promise<{ ticket: string; code: string }> {
    await this.tokens.deleteMany({ uid, kind: 'code' });
    const ticket = randomBytes(32).toString('base64url');
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.tokens.create({ _id: sha256(ticket), uid, kind: 'code', code: sha256(ticket + code), tries: 0, exp: new Date(Date.now() + 10 * 60_000) });
    return { ticket, code };
  }

  /** Comprueba un código: 'ok' (y lo borra), 'bad' (cuenta el intento; al 5.º se anula) o 'gone' (caducado, usado o anulado). */
  async useCode(ticket: string, code: string): Promise<{ r: 'ok'; uid: string } | { r: 'bad' | 'gone' }> {
    const id = sha256(String(ticket));
    const t = await this.tokens.findOne({ _id: id, kind: 'code', exp: { $gt: new Date() } }).lean();
    if (!t) return { r: 'gone' };
    if (t.code === sha256(ticket + code) && (await this.tokens.deleteOne({ _id: id })).deletedCount) return { r: 'ok', uid: t.uid };
    const after = await this.tokens.findOneAndUpdate({ _id: id }, { $inc: { tries: 1 } }, { new: true }).lean();
    if (!after || (after.tries ?? 0) >= 5) { await this.tokens.deleteOne({ _id: id }); return { r: 'gone' }; }
    return { r: 'bad' };
  }

  link(path: string, token: string): string {
    return `${this.appUrl}${path}?token=${encodeURIComponent(token)}`;
  }

  /** Últimos correos a una dirección (solo modo outbox: Mac y pruebas). */
  async lastTo(to: string): Promise<Outbox[]> {
    return this.mode === 'outbox' ? this.outbox.find({ to: to.toLowerCase() }).sort({ _id: -1 }).limit(20).lean() : [];
  }
}
