import { HttpClient, HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, type Observable } from 'rxjs';

import type { AppData, Gdd, Note, SentNote } from './models';

const TOKEN_KEY = 'mygdd.token';

/** Lo que devuelve GET /api/me al entrar. */
export interface MeResponse {
  user: AppData['user'];
  settings: Record<string, unknown>;
  team: AppData['team'];
  gdds: Gdd[];
  notes: Note[];
  sent: SentNote[];
}

/** Mensaje de error de la API en lenguaje del diseño (o uno genérico si no hay conexión). */
export function apiMessage(e: unknown): string {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0) return 'Can’t connect to the server. Check your connection.';
    const m = (e.error as { message?: string | string[] } | null)?.message;
    if (m) return Array.isArray(m) ? m[0] : m;
  }
  return 'Something went wrong. Try again.';
}

/** Añade el token de sesión a cada petición a /api. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(TOKEN_KEY);
  return next(token && req.url.startsWith('/api') ? req.clone({ setHeaders: { Authorization: 'Bearer ' + token } }) : req);
};

/**
 * Conexión con el backend (NestJS). En el Mac, /api llega a localhost:3000 por el proxy de
 * desarrollo; en Render, la web y la API están en la misma dirección.
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

  // ---------- cuenta ----------
  async login(email: string, password: string): Promise<void> {
    const r = await this.run(this.http.post<{ token: string }>('/api/auth/login', { email, password }));
    this.setToken(r.token);
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
  changePassword(current: string, next: string): Promise<unknown> {
    return this.run(this.http.patch('/api/me/password', { current, next }));
  }
  saveTeam(team: AppData['team']): Promise<unknown> {
    return this.run(this.http.put('/api/me/team', team));
  }
  deleteAccount(): Promise<unknown> {
    return this.run(this.http.delete('/api/me'));
  }

  // ---------- datos ----------
  saveGdd(g: Gdd, order: number): Promise<unknown> {
    const { id, ...rest } = g;
    return this.run(this.http.put('/api/gdds/' + encodeURIComponent(id), { ...rest, order }));
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
