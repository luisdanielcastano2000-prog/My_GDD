import { HttpClient, HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { firstValueFrom, type Observable } from 'rxjs';

import { t } from '../i18n/i18n';

import type { AppData, Gdd, Invitation, Note, SentNote, TeamRef } from './models';

const TOKEN_KEY = 'mygdd.token';
const DEVICE_KEY = 'mygdd.device'; // identificador de este navegador (dos pasos); no se borra al salir

/** Lo que devuelve GET /api/me al entrar. */
export interface MeResponse {
  user: AppData['user'];
  settings: Record<string, unknown>;
  team: AppData['team'];
  gdds: Gdd[];
  notes: Note[];
  sent: SentNote[];
  since?: string; // fecha de alta de la cuenta
  teams?: TeamRef[]; // equipos de otras personas en los que estás
  invitations?: Invitation[]; // invitaciones que esperan respuesta
  mail?: boolean; // hay servicio de correo (si no, no se pide verificar el email)
  emailVerified?: boolean;
  pendingEmail?: string; // email nuevo esperando confirmación
  twoStep?: boolean; // verificación en dos pasos activada
}

/** Mensaje de error de la API en lenguaje del diseño (o uno genérico si no hay conexión). */
export function apiMessage(e: unknown, translate = true): string {
  const tr = translate ? t : (s: string): string => s;
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0) return tr('Can’t connect to the server. Check your connection.');
    const m = (e.error as { message?: string | string[] } | null)?.message;
    if (m) return tr(Array.isArray(m) ? m[0] : m);
  }
  return tr('Something went wrong. Try again.');
}

/** Dirección de la API publicada: la usa la app de Android, que lleva la web dentro y no tiene /api al lado. */
export const API_ORIGIN = 'https://my-gdd.onrender.com';

/** Añade el token de sesión a cada petición a /api (y, en la app de Android, la dirección de Render). */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api')) return next(req);
  const token = localStorage.getItem(TOKEN_KEY);
  return next(
    req.clone({
      url: Capacitor.isNativePlatform() ? API_ORIGIN + req.url : req.url,
      ...(token ? { setHeaders: { Authorization: 'Bearer ' + token } } : {}),
    }),
  );
};

/**
 * Conexión con el backend (NestJS). En el Mac, /api llega a localhost:3000 por el proxy de
 * desarrollo; en Render, la web y la API están en la misma dirección; en la app de Android, el
 * interceptor manda /api a Render (API_ORIGIN) y las peticiones salen por la parte nativa (CapacitorHttp),
 * así que el servidor no necesita CORS.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }
  setToken(t: string | null): void {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  }

  private run<T>(o: Observable<T>): Promise<T> {
    return firstValueFrom(o);
  }

  /** Identificador de este navegador: con dos pasos, aquí no se vuelve a pedir el código tras usarlo una vez. */
  get device(): string {
    let d = localStorage.getItem(DEVICE_KEY);
    if (!d) {
      d = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, d);
    }
    return d;
  }

  // ---------- cuenta ----------
  /** Entra. Con dos pasos desde un aparato nuevo no hay token todavía: devuelve el ticket para enviar con el código. */
  async login(email: string, password: string): Promise<string | null> {
    const r = await this.run(
      this.http.post<{ token?: string; ticket?: string }>('/api/auth/login', { email, password, device: this.device }),
    );
    if (r.token) this.setToken(r.token);
    return r.token ? null : (r.ticket ?? null);
  }
  /** Segundo paso: el código del correo. */
  async loginCode(ticket: string, code: string): Promise<void> {
    const r = await this.run(
      this.http.post<{ token: string }>('/api/auth/login/code', { ticket, code, device: this.device }),
    );
    this.setToken(r.token);
  }
  setTwoStep(on: boolean): Promise<unknown> {
    return this.run(this.http.patch('/api/me/two-step', { on, device: this.device }));
  }
  async signup(user: string, email: string, password: string): Promise<void> {
    const r = await this.run(this.http.post<{ token: string }>('/api/auth/signup', { user, email, password }));
    this.setToken(r.token);
  }
  me(): Promise<MeResponse> {
    return this.run(this.http.get<MeResponse>('/api/me'));
  }
  saveProfile(p: Partial<AppData['user']> & { settings?: Record<string, unknown> }): Promise<unknown> {
    return this.run(this.http.patch('/api/me', p));
  }
  /** Cambia la contraseña; el servidor cierra las sesiones de otros aparatos y da un token nuevo a este. */
  async changePassword(current: string, next: string): Promise<void> {
    const r = await this.run(this.http.patch<{ token: string }>('/api/me/password', { current, next }));
    this.setToken(r.token);
  }
  /** «Log out of other devices»: este aparato sigue dentro con un token nuevo. */
  async logoutOthers(): Promise<void> {
    const r = await this.run(this.http.post<{ token: string }>('/api/me/logout-others', { device: this.device }));
    this.setToken(r.token);
  }
  sendFeedback(topic: string, text: string, reply: boolean): Promise<unknown> {
    return this.run(this.http.post('/api/me/feedback', { topic, text, reply }));
  }
  /** Guarda «My team»; el servidor devuelve el equipo tal como queda (solo entra quien acepta). */
  saveTeam(team: AppData['team']): Promise<{ team: AppData['team'] }> {
    return this.run(this.http.put<{ team: AppData['team'] }>('/api/me/team', team));
  }
  // ---------- correo ----------
  forgot(email: string): Promise<{ mail: boolean }> {
    return this.run(this.http.post<{ mail: boolean }>('/api/auth/forgot', { email }));
  }
  resetPassword(token: string, password: string): Promise<unknown> {
    return this.run(this.http.post('/api/auth/reset', { token, password }));
  }
  /** Enlace de un correo: verificar la cuenta o confirmar un email nuevo. */
  verify(token: string): Promise<{ kind: 'verify' | 'email'; email: string }> {
    return this.run(this.http.post<{ kind: 'verify' | 'email'; email: string }>('/api/auth/verify', { token }));
  }
  resendVerify(): Promise<{ sent: boolean }> {
    return this.run(this.http.post<{ sent: boolean }>('/api/me/verify/resend', {}));
  }
  changeEmail(email: string): Promise<{ pending: boolean; email: string }> {
    return this.run(this.http.post<{ pending: boolean; email: string }>('/api/me/email', { email }));
  }
  resendInvite(email: string): Promise<{ sent: boolean }> {
    return this.run(this.http.post<{ sent: boolean }>('/api/me/team/resend', { email }));
  }
  /** Responder a una invitación o salir de un equipo (owner = id de la cuenta dueña). */
  teamAction(owner: string, action: 'accept' | 'decline' | 'leave'): Promise<unknown> {
    return this.run(this.http.post('/api/teams/' + encodeURIComponent(owner) + '/' + action, {}));
  }
  deleteAccount(): Promise<unknown> {
    return this.run(this.http.delete('/api/me'));
  }

  // ---------- datos ----------
  /** Guarda un GDD. Si otra persona lo cambió antes, el servidor responde 409 con su versión (error.gdd). */
  saveGdd(g: Gdd, order: number): Promise<{ rev: number }> {
    const { id, share: _s, ...rest } = g;
    return this.run(this.http.put<{ rev: number }>('/api/gdds/' + encodeURIComponent(id), { ...rest, order }));
  }
  deleteGdd(id: string): Promise<unknown> {
    return this.run(this.http.delete('/api/gdds/' + encodeURIComponent(id)));
  }
  saveNote(box: 'received' | 'sent', n: Note | SentNote): Promise<unknown> {
    return this.run(this.http.put('/api/notes/' + encodeURIComponent(n.id), { box, data: n }));
  }
  deleteNote(id: string): Promise<unknown> {
    return this.run(this.http.delete('/api/notes/' + encodeURIComponent(id)));
  }
}
