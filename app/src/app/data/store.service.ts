import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

import { flipCapture, flipPlay, mvK } from '../shared/motion';

import { ApiService, type MeResponse, apiMessage } from './api.service';
import { mergeGdd } from './merge';
import type { AppData, Block, Dept, Dialog, Gdd, Grant, Invitation, Note, Role, Sheet, Snack, TeamRef } from './models';
import type { Template} from './sample';
import { CATALOG, buildGdd, mkBlock, mkSection, nid, sampleData } from './sample';
import { ago, cap, dayAgo, isReal } from './time';

export type StatusKind = 'old' | 'ok' | 'empty';
export interface Settings {
  textSize: 'Default' | 'Large' | 'Larger';
  highContrast: boolean;
  reduceMotion: boolean;
  slowMotion: boolean; // solo para revisar animaciones (selector de pantallas)
  notifications: boolean;
}

/** Apunta que un GDD acaba de cambiar. */
function touch(g: Gdd): void {
  g.updated = 'Updated today';
  g.uts = Date.now();
}

const DEFAULT_SETTINGS: Settings = { textSize: 'Default', highContrast: false, reduceMotion: false, slowMotion: false, notifications: true };

/**
 * El «almacén» de la app: guarda los datos en memoria y las acciones que los cambian.
 * Las páginas leen de aquí con signals y llaman a sus métodos; nunca cambian los datos directamente.
 */
@Injectable({ providedIn: 'root' })
export class StoreService {
  private api = inject(ApiService);

  // ---------- estado ----------
  readonly data = signal<AppData>(sampleData());
  /** true = cuenta real: los cambios se guardan en el servidor. false = datos de ejemplo (selector de pantallas). */
  readonly live = signal(false);
  private snapshot: AppData | null = null; // lo último que sabemos que está guardado en el servidor
  private savedSettings = '';
  private syncTimer: ReturnType<typeof setTimeout> | undefined;
  private syncing = false;
  private syncAgain = false;
  private refreshing = false;
  private refreshAfterSync = false; // tras enviar una nota que marca bloques
  /** Sube cada vez que cambian los datos o lo guardado: un refresco que empezó antes ya no vale. */
  private gen = 0;
  readonly loadErr = signal(false);
  readonly sheet = signal<Sheet | null>(null);
  readonly dialog = signal<Dialog | null>(null);
  readonly snack = signal<Snack | null>(null);
  readonly dying = signal<string | null>(null); // id de lo que se está borrando (animación)
  readonly popped = signal<string | null>(null); // id de lo recién creado (animación)
  readonly rebuilding = signal<string | null>(null); // id de lo que vuelve con Undo (se reconstruye en cuadrados)
  private lastDeleted: string | null = null;
  readonly homeIndex = signal(0);
  readonly notesTab = signal<'r' | 's'>('r');
  readonly notesCollapsed = signal<Record<string, boolean>>({});
  readonly settings = signal<Settings>({ ...DEFAULT_SETTINGS });
  readonly systemDark = signal(typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches);
  /** Valores iniciales de formularios (los usa el selector de pantallas para abrir un estado concreto). */
  private drafts: Record<string, Record<string, unknown>> = {};
  private undoData: AppData | null = null;
  private snackTimer: ReturnType<typeof setTimeout> | undefined;

  /** Acento que se está probando en Edit profile (sin guardar); null = el de la cuenta. */
  readonly previewAccent = signal<string | null>(null);
  readonly dark = computed(() => {
    const t = this.data().user.theme;
    return t === 'Dark' || (t === 'System' && this.systemDark());
  });
  /** La hora actual, cada minuto: hace que «5 min ago» avance solo. */
  readonly now = signal(Date.now());
  /** Fecha de alta de la cuenta (la da el servidor). */
  readonly since = signal<number | null>(null);
  /** Invitaciones a equipos de otras personas que esperan respuesta (las da el servidor). */
  readonly invitations = signal<Invitation[]>([]);
  /** Equipos de otras personas en los que estás. */
  readonly teams = signal<TeamRef[]>([]);
  /** Correo: si hay servicio, hay que verificar el email para invitar y aceptar invitaciones. */
  readonly mailOn = signal(false);
  readonly emailVerified = signal(true);
  readonly pendingEmail = signal<string | null>(null);
  readonly verifyRequired = computed(() => this.live() && this.mailOn() && !this.emailVerified());
  readonly unread = computed(() => this.data().notes.filter((n) => n.unread).length + this.invitations().length);

  constructor() {
    setInterval(() => this.now.set(Date.now()), 60_000);
    // Lo que cambian otras personas del equipo aparece solo: cada 30 s y al volver a la pestaña
    setInterval(() => void this.refresh(), 30_000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.refresh();
      else if (this.live() && this.dirty()) { clearTimeout(this.syncTimer); void this.sync(); } // al irse de la pestaña: guardar ya
    });
    // Cerrar o recargar con algo sin guardar (la app guarda 0,4 s después de cada cambio): el navegador pregunta antes
    addEventListener('beforeunload', (e) => {
      if (!this.live() || !this.dirty()) return;
      clearTimeout(this.syncTimer);
      void this.sync();
      e.preventDefault();
    });
    if (typeof matchMedia !== 'undefined') {
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => this.systemDark.set(e.matches));
    }
    // Aplica tema, contraste, tamaño de texto y movimiento como clases de <html>
    effect(() => {
      const s = this.settings();
      const dark = this.dark();
      const root = document.documentElement;
      root.classList.remove('theme-dark', 'theme-light-hc', 'theme-dark-hc', 'ion-palette-dark', 'ts-large', 'ts-larger');
      if (s.highContrast) root.classList.add(dark ? 'theme-dark-hc' : 'theme-light-hc');
      else if (dark) root.classList.add('theme-dark');
      if (dark) root.classList.add('ion-palette-dark');
      root.classList.toggle('reduce-motion', s.reduceMotion);
      try { localStorage.setItem('gdd-reduce-motion', s.reduceMotion ? '1' : '0'); } catch { /* sin almacenamiento */ } // para el arranque (splash)
      root.classList.toggle('motion-slow', s.slowMotion);
      const ts = s.textSize === 'Larger' ? 1.4 : s.textSize === 'Large' ? 1.2 : 1;
      root.style.setProperty('--gdd-ts', String(ts));
      if (ts > 1) root.classList.add(ts > 1.3 ? 'ts-larger' : 'ts-large');
    });
    // Color de acento: clase accent-<color> en <html> (botones, enlaces, selección; ver theme/accents.css)
    effect(() => {
      const a = (this.previewAccent() ?? this.data().user.accent ?? 'Blue').toLowerCase();
      const root = document.documentElement;
      [...root.classList].filter((c) => c.startsWith('accent-')).forEach((c) => root.classList.remove(c));
      if (a !== 'blue') root.classList.add('accent-' + a);
    });
    // Los ajustes de accesibilidad también se guardan en la cuenta
    effect(() => {
      this.settings();
      this.scheduleSync();
    });
  }

  // ---------- servidor: cargar y guardar ----------
  /** Carga los datos de la cuenta (GET /api/me). Devuelve false si no hay sesión válida. */
  async load(): Promise<boolean> {
    if (!this.api.token) return false;
    try {
      const r = await this.api.me();
      this.apply(r);
      this.settings.set({ ...DEFAULT_SETTINGS, ...(r.settings as Partial<Settings>), slowMotion: false });
      this.savedSettings = this.settingsKey();
      this.loadErr.set(false);
      this.live.set(true);
      return true;
    } catch (e) {
      if (e instanceof HttpErrorResponse && (e.status === 401 || e.status === 404)) { this.logout(); return false; }
      this.loadErr.set(true); // Home enseña «We couldn’t load your GDDs» con Retry
      this.live.set(false);
      return true;
    }
  }
  /** Pone en pantalla lo que llega del servidor y lo apunta como guardado. */
  private apply(r: MeResponse): void {
    this.gen++;
    const d: AppData = { gdds: r.gdds, notes: r.notes, sent: r.sent, user: r.user, team: r.team };
    this.data.set(d);
    this.since.set(r.since ? Date.parse(r.since) : null);
    this.invitations.set(r.invitations ?? []);
    this.mailOn.set(!!r.mail);
    this.emailVerified.set(r.emailVerified ?? true);
    this.pendingEmail.set(r.pendingEmail ?? null);
    this.teams.set(r.teams ?? []);
    this.snapshot = structuredClone(d);
    this.homeIndex.set(Math.max(0, Math.min(this.homeIndex(), d.gdds.length - 1)));
  }
  /** ¿Hay cambios en pantalla que aún no están en el servidor? */
  private dirty(): boolean {
    return !this.snapshot || JSON.stringify(this.data()) !== JSON.stringify(this.snapshot) || this.settingsKey() !== this.savedSettings;
  }
  /**
   * Trae lo último del servidor (cambios de otras personas del equipo, notas e invitaciones nuevas).
   * Solo si no hay nada tuyo pendiente de guardar ni una capa abierta: nunca pisa lo que estás haciendo.
   */
  async refresh(): Promise<void> {
    if (!this.live() || this.syncing || this.refreshing || this.dirty() || this.sheet() || this.dialog()) return;
    this.refreshing = true;
    const gen = this.gen;
    try {
      const r = await this.api.me();
      // Si mientras tanto cambiaste algo, se guardó algo o se recargó (p. ej. al salir de un equipo), esta respuesta ya es vieja
      if (gen === this.gen && !this.syncing && !this.dirty()) this.apply(r);
    } catch (e) {
      if (e instanceof HttpErrorResponse && (e.status === 401 || e.status === 404)) { this.logout(); location.assign('/login'); }
    } finally {
      this.refreshing = false;
    }
  }
  /** Espera a que todo lo pendiente esté guardado (antes de recargar los datos). */
  private async settle(): Promise<void> {
    clearTimeout(this.syncTimer);
    for (let i = 0; i < 100 && (this.syncing || this.dirty()); i++) {
      if (!this.syncing) await this.sync();
      else await new Promise((ok) => setTimeout(ok, 100));
      if (!this.syncing && this.dirty()) break; // no se pudo guardar: el snackbar ya lo dice
    }
  }
  logout(): void {
    this.api.setToken(null);
    this.live.set(false);
    this.snapshot = null;
    this.reset(true);
    this.data.update((d) => ({ ...d, user: { ...d.user, name: '', user: '', email: '' } }));
  }
  private settingsKey(): string {
    const { slowMotion: _s, ...rest } = this.settings();
    return JSON.stringify(rest);
  }
  private scheduleSync(): void {
    if (!this.live()) return;
    clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => void this.sync(), 400);
  }
  /** Envía al servidor solo lo que ha cambiado desde la última vez que se guardó. */
  async sync(): Promise<void> {
    const old = this.snapshot;
    if (!this.live() || !old) return;
    if (this.syncing) { this.syncAgain = true; return; }
    this.syncing = true;
    const cur = this.data();
    const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
    const jobs: Promise<unknown>[] = [];
    const revs = new Map<string, number>(); // versión nueva de cada GDD guardado
    const conflicts = new Map<string, Gdd>(); // GDDs que otra persona cambió antes (su versión)
    cur.gdds.forEach((g, i) => {
      const o = old.gdds.findIndex((x) => x.id === g.id);
      const changed = o < 0 || !same(old.gdds[o], g);
      const moved = o !== i && !g.share; // el orden en Home solo cuenta en los GDDs tuyos
      if ((!changed && !moved) || g.share?.role === 'Viewer') return;
      jobs.push(
        this.api.saveGdd(g, i).then(
          (r) => { revs.set(g.id, r.rev); },
          (e: unknown) => {
            const theirs = e instanceof HttpErrorResponse && e.status === 409 ? (e.error as { gdd?: Gdd } | null)?.gdd : null;
            if (theirs) { conflicts.set(g.id, theirs); return; }
            throw e;
          },
        ),
      );
    });
    old.gdds.filter((g) => !g.share && !cur.gdds.some((x) => x.id === g.id)).forEach((g) => jobs.push(this.api.deleteGdd(g.id)));
    const boxes: ['received' | 'sent', 'notes' | 'sent'][] = [['received', 'notes'], ['sent', 'sent']];
    for (const [box, key] of boxes) {
      const a: (Note | AppData['sent'][number])[] = old[key];
      const b: (Note | AppData['sent'][number])[] = cur[key];
      b.forEach((n) => { if (!same(a.find((x) => x.id === n.id), n)) jobs.push(this.api.saveNote(box, n)); });
      a.filter((n) => !b.some((x) => x.id === n.id)).forEach((n) => jobs.push(this.api.deleteNote(n.id)));
    }
    const prof = Object.fromEntries(Object.entries(cur.user).filter(([k, v]) => !same((old.user as unknown as Record<string, unknown>)[k], v)));
    const sk = this.settingsKey();
    if (Object.keys(prof).length || sk !== this.savedSettings) {
      jobs.push(this.api.saveProfile({ ...prof, ...(sk !== this.savedSettings ? { settings: JSON.parse(sk) as Record<string, unknown> } : {}) }));
    }
    let team: AppData['team'] | null = null; // el equipo tal como lo deja el servidor
    if (!same(old.team, cur.team)) jobs.push(this.api.saveTeam(cur.team).then((r) => { team = r.team; }));
    try {
      await Promise.all(jobs);
      const snap = structuredClone(cur);
      revs.forEach((rev, id) => { const g = snap.gdds.find((x) => x.id === id); if (g) g.rev = rev; });
      conflicts.forEach((theirs, id) => { const i = snap.gdds.findIndex((x) => x.id === id); if (i >= 0) snap.gdds[i] = { ...theirs, share: snap.gdds[i].share }; });
      if (team) snap.team = team;
      this.snapshot = snap;
      this.savedSettings = sk;
      this.gen++;
      if (revs.size || conflicts.size || team) {
        // Lo que se ve: con las versiones nuevas y, si hubo choque, con los dos cambios juntos
        const d = structuredClone(this.data());
        revs.forEach((rev, id) => { const g = d.gdds.find((x) => x.id === id); if (g) g.rev = rev; });
        conflicts.forEach((theirs, id) => {
          const i = d.gdds.findIndex((x) => x.id === id);
          if (i >= 0) d.gdds[i] = mergeGdd(old.gdds.find((x) => x.id === id), d.gdds[i], { ...theirs, share: d.gdds[i].share });
        });
        if (team && same(d.team, cur.team)) d.team = team;
        this.data.set(d);
      }
      if (conflicts.size) { this.syncAgain = true; this.toast('Someone in your team changed this GDD too. Both changes were kept.'); }
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 401) { this.logout(); location.assign('/login'); return; }
      const shown = e instanceof HttpErrorResponse && [400, 403, 404].includes(e.status);
      this.toast(shown ? apiMessage(e) : 'Your change couldn’t be saved.', { kind: 'err', action: { label: 'Retry', run: () => void this.sync() } });
    } finally {
      this.syncing = false;
      if (this.syncAgain) { this.syncAgain = false; void this.sync(); }
      else if (this.refreshAfterSync) { this.refreshAfterSync = false; setTimeout(() => void this.refresh(), 0); }
    }
  }

  // ---------- lectura ----------
  gdd(id: string | null | undefined): Gdd | null {
    return this.data().gdds.find((g) => g.id === id) ?? null;
  }
  dept(g: Gdd | null, id: string | null | undefined): Dept | null {
    return g?.depts.find((d) => d.id === id) ?? null;
  }
  where(bid: string, d: AppData = this.data()): { g: Gdd; dp: Dept; b: Block } | null {
    for (const g of d.gdds) for (const dp of g.depts) for (const b of dp.blocks) if (b.id === bid) return { g, dp, b };
    return null;
  }
  /** «Updated yesterday», «Created today»… (o el texto fijo de los datos de ejemplo). */
  gUpdated(g: Gdd): string {
    const now = this.now();
    if (isReal(g.uts)) return 'Updated ' + dayAgo(g.uts, now);
    if (isReal(g.cts)) return 'Created ' + dayAgo(g.cts, now);
    return g.updated;
  }
  /** «Just now», «5 min ago»… para una nota (o su texto fijo si es de ejemplo). */
  when(ts: number | undefined, fixed: string): string {
    return isReal(ts) ? cap(ago(ts, this.now())) : fixed;
  }
  // ---------- permisos (GDDs de otras personas) ----------
  /** Tu papel en un GDD: Owner (es tuyo), Editor (puedes escribir) o Viewer (solo leer). */
  role(gid: string | null | undefined): Role {
    return this.gdd(gid)?.share?.role ?? 'Owner';
  }
  /** Departamentos en los que puede escribir un «Editor de departamentos» (vacío = todos). */
  myDepts(gid: string | null | undefined): string[] {
    return this.gdd(gid)?.share?.depts ?? [];
  }
  /** ¿Puedes escribir en algo de este GDD? (Viewer: no). */
  canEdit(gid: string | null | undefined): boolean {
    return this.role(gid) !== 'Viewer';
  }
  /** ¿Puedes escribir en los bloques de este departamento? */
  canEditDept(gid: string | null | undefined, dpid: string | null | undefined): boolean {
    const r = this.role(gid);
    if (r === 'Owner') return true;
    if (r === 'Viewer') return false;
    const ds = this.myDepts(gid);
    return !ds.length || (!!dpid && ds.includes(dpid));
  }
  /** ¿Puedes crear, renombrar, mover o borrar departamentos? (dueño o Editor de todo el GDD). */
  canManageDepts(gid: string | null | undefined): boolean {
    const r = this.role(gid);
    return r === 'Owner' || (r === 'Editor' && !this.myDepts(gid).length);
  }
  /**
   * true (y lo avisa) si NO puedes hacer algo:
   * 'owner' = solo el dueño (el GDD en sí) · 'depts' = la lista de departamentos · 'dept' = los bloques de dpid.
   */
  private deny(gid: string | null | undefined, need: 'owner' | 'depts' | 'dept', dpid?: string | null): boolean {
    const g = this.gdd(gid);
    if (!g?.share) return false;
    const ok = need === 'owner' ? false : need === 'depts' ? this.canManageDepts(gid) : this.canEditDept(gid, dpid);
    if (ok) return false;
    this.toast(need === 'owner' ? 'Only ' + g.share.name + ' can do this.' : g.share.role === 'Viewer' ? 'You can only read this GDD.' : need === 'depts' ? 'Only editors of the whole GDD can change its departments.' : 'You can only edit your departments.');
    return true;
  }
  /** deny() para un bloque (busca su GDD y departamento). */
  private denyBlock(bid: string): boolean {
    const w = this.where(bid);
    return !!w && this.deny(w.g.id, 'dept', w.dp.id);
  }

  gStat(g: Gdd): { t: string; k: StatusKind; n: number } {
    let old = 0, has = 0, total = 0;
    g.depts.forEach((x) => x.blocks.forEach((y) => { total++; if (y.status === 'Out of date') old++; if (y.status !== 'Empty') has++; }));
    if (old) return { t: old + (old === 1 ? ' block' : ' blocks') + ' out of date', k: 'old', n: old };
    if (has) return { t: 'Up to date', k: 'ok', n: 0 };
    return { t: total ? total + (total === 1 ? ' block' : ' blocks') + ' to write' : 'No departments yet', k: 'empty', n: 0 };
  }
  dStat(dp: Dept): { t: string; k: StatusKind; nb: string; old: number } {
    const n = dp.blocks.length;
    const nb = n + (n === 1 ? ' block' : ' blocks');
    if (!n) return { t: 'No blocks yet', k: 'empty', nb, old: 0 };
    const old = dp.blocks.filter((y) => y.status === 'Out of date').length;
    if (old) return { t: nb + ' · ' + old + ' out of date', k: 'old', nb, old };
    if (dp.blocks.some((y) => y.status !== 'Empty')) return { t: nb + ' · Up to date', k: 'ok', nb, old: 0 };
    return { t: nb + ' · Empty', k: 'empty', nb, old: 0 };
  }
  deptColor(g: Gdd, dp: Dept): string {
    return 'var(--gdd-bkc-' + (dp.col ?? (g.depts.indexOf(dp) % 6) + 1) + ')';
  }

  // ---------- utilidades internas ----------
  /** Cambia los datos sobre una copia (como hace el prototipo) y la guarda. */
  private mutate(fn: (d: AppData) => void, keepUndo = false): void {
    const d = structuredClone(this.data());
    if (keepUndo) this.undoData = this.data();
    fn(d);
    this.data.set(d);
    this.gen++;
    this.scheduleSync();
  }
  takeDraft<T extends object>(key: string, fallback: T): T {
    const v = this.drafts[key];
    delete this.drafts[key];
    return { ...fallback, ...(v as Partial<T>) };
  }
  setDraft(key: string, v: Record<string, unknown>): void {
    this.drafts[key] = v;
  }

  // ---------- snackbar ----------
  toast(msg: string, opts: Partial<Omit<Snack, 'id' | 'msg'>> = {}): void {
    clearTimeout(this.snackTimer);
    const s: Snack = { id: Date.now(), msg, ...opts };
    this.snack.set(s);
    const k = this.settings().slowMotion ? 4 : 1;
    this.snackTimer = setTimeout(() => { if (this.snack()?.id === s.id) this.snack.set(null); }, (s.undo || s.action ? 10000 : 4000) * k);
  }
  undo(): void {
    if (this.undoData) {
      const before = flipCapture();
      const id = this.lastDeleted;
      // Volver a como estaba, pero con la versión (rev) actual de cada GDD: el borrado ya se guardó y subió
      // la versión; con la vieja, el servidor lo tomaría por un cambio de otra persona (409).
      const revs = new Map(this.data().gdds.map((g) => [g.id, g.rev]));
      const back = structuredClone(this.undoData);
      back.gdds.forEach((g) => { if (revs.has(g.id)) g.rev = revs.get(g.id); });
      this.data.set(back);
      this.gen++;
      this.scheduleSync();
      flipPlay(before); // los vecinos se apartan para dejarle sitio
      if (id) { // y lo borrado se reconstruye en cuadrados
        this.rebuilding.set(id);
        setTimeout(() => { if (this.rebuilding() === id) this.rebuilding.set(null); }, 700 * mvK());
      }
    }
    this.lastDeleted = null;
    this.undoData = null;
    this.dying.set(null);
    this.snack.set(null);
  }
  closeLayers(): void {
    this.sheet.set(null);
    this.dialog.set(null);
  }

  /** Espera la animación de borrar antes de cambiar los datos (si «menos movimiento» está activo, no espera). */
  private afterDissolve(id: string, fn: () => void): void {
    const ms = this.settings().reduceMotion ? 150 : 420 * (this.settings().slowMotion ? 4 : 1);
    this.dying.set(id);
    setTimeout(() => {
      const before = flipCapture();
      this.lastDeleted = id;
      fn();
      this.dying.set(null);
      flipPlay(before); // el hueco se cierra deslizando los vecinos
    }, ms);
  }
  private pop(id: string): void {
    this.popped.set(id);
    setTimeout(() => { if (this.popped() === id) this.popped.set(null); }, 2500);
  }

  // ---------- acceso ----------
  /** Crea la cuenta en el servidor, entra y carga sus datos (empieza vacía). */
  async signup(user: string, email: string, password: string): Promise<void> {
    await this.api.signup(user, email, password);
    await this.load();
    this.toast('Account created. Welcome, ' + this.data().user.name + '!');
  }
  async login(email: string, password: string): Promise<void> {
    await this.api.login(email, password);
    this.reset(true);
    await this.load();
  }

  // ---------- crear ----------
  createGdd(name: string, tpl: Template, on: number[]): Gdd {
    const g = buildGdd(name, tpl, [...on].sort((a, b) => a - b));
    g.cts = Date.now();
    this.mutate((d) => d.gdds.unshift(g));
    this.homeIndex.set(0);
    this.pop(g.id);
    this.toast(name + ' created');
    return g;
  }
  private uniq(base: string, names: string[]): string {
    if (!names.includes(base)) return base;
    let i = 2;
    while (names.includes(base + ' ' + i)) i++;
    return base + ' ' + i;
  }
  quickDept(gid: string): void {
    if (this.deny(gid, 'depts')) return;
    const g0 = this.gdd(gid);
    if (!g0) return;
    const name = this.uniq('New department', g0.depts.map((x) => x.name));
    const last = g0.depts[g0.depts.length - 1];
    const lc = last ? last.col ?? ((g0.depts.length - 1) % 6) + 1 : 0;
    const nd: Dept = { id: nid(), name, blocks: [], col: (lc % 6) + 1 };
    this.mutate((d) => { const g = d.gdds.find((x) => x.id === gid)!; g.depts.push(nd); touch(g); });
    this.pop(nd.id);
    this.toast(name + ' created');
  }
  quickBlock(gid: string, dpid: string): void {
    if (this.deny(gid, 'dept', dpid)) return;
    const dp0 = this.dept(this.gdd(gid), dpid);
    if (!dp0) return;
    const name = this.uniq('New block', dp0.blocks.map((x) => x.name));
    const nb = mkBlock(name, '');
    this.mutate((d) => { const g = d.gdds.find((x) => x.id === gid)!; g.depts.find((x) => x.id === dpid)!.blocks.push(nb); touch(g); });
    this.pop(nb.id);
    this.toast(name + ' created');
  }
  useTemplate(gid: string): void {
    if (this.deny(gid, 'depts')) return;
    const t = buildGdd('x', 'Minimal', [0, 2, 3, 5]);
    this.mutate((d) => { const g = d.gdds.find((x) => x.id === gid)!; g.depts = g.depts.concat(t.depts); touch(g); });
    this.toast('Minimal template added: 4 departments');
  }
  suggest(gid: string, dpid: string): void {
    if (this.deny(gid, 'dept', dpid)) return;
    let n = 0;
    this.mutate((d) => {
      const dp = d.gdds.find((x) => x.id === gid)!.depts.find((x) => x.id === dpid)!;
      const c = CATALOG.find((x) => x[0].toLowerCase() === dp.name.toLowerCase());
      const list: [string, string][] = c ? c[2] : [['Overview', 'What this department does and its goals.'], ['Tasks', 'The work to do, in order.'], ['References', 'Links, images and examples to follow.']];
      dp.blocks = dp.blocks.concat(list.map((x) => mkBlock(x[0], x[1])));
      n = list.length;
    });
    this.toast(n + ' suggested blocks added');
  }

  // ---------- editor ----------
  setSec(bid: string, sid: string, key: 't' | 'x', v: string): void {
    if (this.denyBlock(bid)) return;
    this.mutate((d) => { const s = this.where(bid, d)?.b.secs.find((x) => x.id === sid); if (s) s[key] = v; });
  }
  fmtSec(bid: string, sid: string, key: 'big' | 'b' | 'i' | 'list'): void {
    if (this.denyBlock(bid)) return;
    this.mutate((d) => {
      const s = this.where(bid, d)?.b.secs.find((x) => x.id === sid);
      if (!s) return;
      if (key === 'list') {
        const lines = (s.x || '').split('\n');
        const all = lines.every((l) => l.startsWith('• '));
        s.x = lines.map((l) => (all ? l.replace(/^• /, '') : l.startsWith('• ') ? l : '• ' + l)).join('\n');
      } else s[key] = !s[key];
    });
  }
  addSec(bid: string): string {
    const s = mkSection();
    if (this.denyBlock(bid)) return s.id;
    this.mutate((d) => this.where(bid, d)?.b.secs.push(s));
    return s.id;
  }
  /** Guarda el bloque: si estaba pendiente de revisar, queda revisado. Devuelve el mensaje del snackbar. */
  save(bid: string): string {
    let msg = '';
    if (this.denyBlock(bid)) return '';
    this.mutate((d) => {
      const w = this.where(bid, d);
      if (!w) return;
      const had = w.b.pend || w.b.secs.some((s) => s.rev);
      w.b.secs.forEach((s) => { s.rev = false; s.chg = ''; });
      w.b.pend = false;
      const has = w.b.secs.some((s) => (s.x || '').trim() || (s.t || '').trim());
      w.b.status = has ? 'Up to date' : 'Empty';
      d.notes.forEach((n) => { if (n.kind === 'change' && n.aff?.includes(bid) && !n.rvd?.includes(bid)) n.rvd?.push(bid); });
      touch(w.g);
      w.g.last = { dp: w.dp.id, b: bid, when: 'Edited just now', ts: Date.now() };
      msg = had ? w.b.name + ' reviewed · Up to date' : has ? w.b.name + ' saved · Up to date' : w.b.name + ' saved';
    });
    return msg;
  }
  /** Marca un bloque como revisado (lo usa el selector de pantallas). */
  markReviewed(bid: string): void {
    if (this.denyBlock(bid)) return;
    this.mutate((d) => {
      const w = this.where(bid, d);
      if (!w) return;
      w.b.secs.forEach((s) => { s.rev = false; s.chg = ''; });
      w.b.pend = false;
      w.b.status = 'Up to date';
      d.notes.forEach((n) => { if (n.kind === 'change' && n.aff?.includes(bid) && !n.rvd?.includes(bid)) n.rvd?.push(bid); });
    });
  }

  // ---------- renombrar, mover, borrar ----------
  openRename(what: 'gdd' | 'dept' | 'block', id: string, g?: string, dp?: string): void {
    let val = '';
    if (what === 'gdd' ? this.deny(id, 'owner') : what === 'dept' ? this.deny(g, 'depts') : this.deny(g, 'dept', dp)) { this.sheet.set(null); return; }
    if (what === 'gdd') val = this.gdd(id)?.name ?? '';
    if (what === 'dept') val = this.dept(this.gdd(g), id)?.name ?? '';
    if (what === 'block') val = this.where(id)?.b.name ?? '';
    this.sheet.set(null);
    this.dialog.set({ k: 'rename', what, id, g, dp, val, err: false });
  }
  saveRename(dl: Extract<Dialog, { k: 'rename' }>): boolean {
    const v = dl.val.trim();
    if (!v && dl.what !== 'field') { this.dialog.set({ ...dl, err: true }); return false; }
    this.mutate((d) => {
      if (dl.what === 'gdd') d.gdds.find((x) => x.id === dl.id)!.name = v;
      if (dl.what === 'dept') d.gdds.find((x) => x.id === dl.g)!.depts.find((x) => x.id === dl.id)!.name = v;
      if (dl.what === 'block') this.where(dl.id!, d)!.b.name = v;
      if (dl.what === 'field' && dl.key) d.user[dl.key] = v;
    });
    this.dialog.set(null);
    this.toast(dl.what === 'field' ? dl.label + ' saved' : 'Name changed');
    return true;
  }
  /** Lista donde está el elemento de una hoja de acciones (para mover y borrar). En Home se ordenan solo los GDDs tuyos. */
  private listOf(d: AppData, sh: Extract<Sheet, { k: 'act' }>): { id: string; name: string }[] {
    if (sh.what === 'gdd') return d.gdds.filter((g) => !g.share);
    const g = d.gdds.find((x) => x.id === sh.g);
    if (sh.what === 'dept') return g?.depts ?? [];
    return g?.depts.find((x) => x.id === sh.dp)?.blocks ?? [];
  }
  actIndex(sh: Extract<Sheet, { k: 'act' }>): { idx: number; len: number; name: string } {
    const arr = this.listOf(this.data(), sh);
    const idx = arr.findIndex((x) => x.id === sh.id);
    return { idx, len: arr.length, name: idx >= 0 ? arr[idx].name : sh.what === 'gdd' ? (this.gdd(sh.id)?.name ?? '') : '' };
  }
  move(sh: Extract<Sheet, { k: 'act' }>, dir: -1 | 1): void {
    if (sh.what === 'gdd' ? this.deny(sh.id, 'owner') : sh.what === 'dept' ? this.deny(sh.g, 'depts') : this.deny(sh.g, 'dept', sh.dp)) { this.sheet.set(null); return; }
    this.mutate((d) => {
      const arr = this.listOf(d, sh);
      const i = arr.findIndex((x) => x.id === sh.id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      if (sh.what === 'gdd') { d.gdds = [...arr as Gdd[], ...d.gdds.filter((g) => g.share)]; this.homeIndex.set(j); }
    });
    this.sheet.set(null);
  }
  /** Reordenar arrastrando (departamentos de un GDD o bloques de un departamento). */
  reorder(what: 'dept' | 'block', gid: string, dpid: string | null, from: number, to: number): void {
    if (what === 'dept' ? this.deny(gid, 'depts') : this.deny(gid, 'dept', dpid)) return;
    let name = '', n = 0;
    this.mutate((d) => {
      const g = d.gdds.find((x) => x.id === gid);
      const arr: { name: string }[] | undefined = what === 'dept' ? g?.depts : g?.depts.find((x) => x.id === dpid)?.blocks;
      if (!g || !arr || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return;
      const [it] = arr.splice(from, 1);
      arr.splice(to, 0, it);
      name = it.name;
      n = arr.length;
      touch(g);
    });
    if (name) this.toast(name + ' moved to position ' + (to + 1) + ' of ' + n);
  }
  /** Animación de una tarjeta: 'out' se desintegra (al borrar) · 'in' se reconstruye (Undo). */
  tile(id: string): 'out' | 'in' | null {
    return this.dying() === id ? 'out' : this.rebuilding() === id ? 'in' : null;
  }
  askDelete(sh: Extract<Sheet, { k: 'act' }>): void {
    this.sheet.set(null);
    if (sh.what === 'gdd' ? this.deny(sh.id, 'owner') : sh.what === 'dept' ? this.deny(sh.g, 'depts') : this.deny(sh.g, 'dept', sh.dp)) return;
    if (sh.what === 'block') this.deleteBlock(sh.id);
    else if (sh.what === 'dept') this.deleteDept(sh.id, sh.g!);
    else this.dialog.set({ k: 'del', what: 'gdd', id: sh.id });
  }
  deleteBlock(bid: string): void {
    const w = this.where(bid);
    if (!w || this.deny(w.g.id, 'dept', w.dp.id)) return;
    this.afterDissolve(bid, () => {
      this.mutate((d) => { const x = this.where(bid, d)!; x.dp.blocks = x.dp.blocks.filter((b) => b.id !== bid); touch(x.g); }, true);
      this.toast(w.b.name + ' deleted', { undo: true });
    });
  }
  deleteDept(did: string, gid: string): void {
    const dp = this.dept(this.gdd(gid), did);
    if (!dp || this.deny(gid, 'depts')) return;
    this.afterDissolve(did, () => {
      this.mutate((d) => { const g = d.gdds.find((x) => x.id === gid)!; g.depts = g.depts.filter((x) => x.id !== did); touch(g); }, true);
      this.toast(dp.name + ' deleted', { undo: true });
    });
  }
  /** Confirmación del diálogo «Delete …?» (proyecto, persona del equipo o cuenta). */
  confirmDelete(dl: Extract<Dialog, { k: 'del' }>): 'account' | void {
    this.dialog.set(null);
    if (dl.what === 'account') {
      const done = () => { this.logout(); this.toast('Your account was deleted'); };
      if (this.live()) this.api.deleteAccount().then(done, (e: unknown) => this.toast(apiMessage(e), { kind: 'err' }));
      else done();
      return 'account';
    }
    if (dl.what === 'gdd') {
      const name = this.gdd(dl.id)?.name ?? '';
      this.afterDissolve(dl.id!, () => {
        this.mutate((d) => { d.gdds = d.gdds.filter((x) => x.id !== dl.id); d.notes = d.notes.filter((n) => n.g !== dl.id); }); // solo el dueño llega aquí
        this.homeIndex.set(Math.max(0, Math.min(this.homeIndex(), this.data().gdds.length - 1)));
        this.toast(name + ' deleted');
      });
    }
    if (dl.what === 'member') {
      const name = this.data().team.members.find((x) => x.id === dl.id)?.name ?? '';
      this.afterDissolve(dl.id!, () => {
        this.mutate((d) => { d.team.members = d.team.members.filter((x) => x.id !== dl.id); });
        this.toast(name + ' was removed from your team');
      });
    }
  }

  // ---------- notas ----------
  markNotesRead(): void {
    if (this.unread()) this.mutate((d) => d.notes.forEach((n) => (n.unread = false)));
  }
  deleteNote(id: string, sent: boolean): void {
    this.sheet.set(null);
    this.afterDissolve(id, () => {
      this.mutate((d) => { if (sent) d.sent = d.sent.filter((n) => n.id !== id); else d.notes = d.notes.filter((n) => n.id !== id); }, true);
      this.toast('Note deleted', { undo: true });
    });
  }
  /**
   * Envía una nota. Si lleva bloques afectados (aff), el servidor los marca como «Out of date» en el GDD
   * para todo el equipo y entrega a los demás un aviso de cambio (que abre la pantalla Review).
   */
  sendNote(text: string, gid: string, dpid: string | null, cTeam: boolean, cDep: boolean, bid: string | null = null, aff: string[] = []): void {
    this.mutate((d) => {
      const g = d.gdds.find((x) => x.id === gid) ?? d.gdds[0];
      const dp = g.depts.find((x) => x.id === dpid) ?? g.depts[0] ?? null;
      const to: string[] = [];
      if (cTeam) to.push('Whole team');
      if (dp && cDep) to.push(dp.name);
      d.sent.push({ id: nid(), g: g.id, ...(dp ? { dp: dp.id } : {}), ...(dp && cDep && !cTeam ? { toDept: dp.id } : {}), ...(bid ? { b: bid } : {}), ...(aff.length ? { aff } : {}), text, to: to.length ? to.join(', ') : 'Whole team', when: 'Just now', ts: Date.now() });
      if (!this.live() && aff.length) { // selector de pantallas (sin servidor): se marcan aquí
        g.depts.forEach((x) => x.blocks.forEach((b) => { if (aff.includes(b.id)) { b.pend = true; b.status = 'Out of date'; } }));
      }
    });
    if (aff.length && this.live()) this.refreshAfterSync = true; // los bloques los marca el servidor: traerlos al acabar
    this.notesTab.set('s');
    this.toast(aff.length ? 'Note sent · ' + aff.length + (aff.length === 1 ? ' block' : ' blocks') + ' marked out of date' : 'Note sent', { kind: 'ok' });
  }
  notify(n: Note | null): void {
    this.mutate((d) => d.sent.push({ id: nid(), g: n?.g, text: 'Please review: ' + (n ? n.title : 'the latest change'), to: 'Whole team', when: 'Just now', ts: Date.now() }));
    this.toast('Team notified');
  }

  // ---------- perfil y equipo ----------
  saveProfile(name: string, user: string, email: string, theme: 'Light' | 'Dark' | 'System', accent: string): void {
    const changed = email.trim().toLowerCase() !== this.data().user.email.toLowerCase();
    const live = this.live();
    this.mutate((d) => {
      d.user.name = name;
      d.user.user = user.trim().replace(/^@/, '') || d.user.user;
      d.user.theme = theme;
      d.user.accent = accent;
      if (!live) d.user.email = email; // con cuenta real, el email se cambia aparte (hay que confirmarlo)
      const me = d.team.members.find((x) => x.you);
      if (me) { me.name = name; if (!live) me.email = email; }
    });
    if (!changed || !live) { this.toast(changed ? 'Changes saved. Check ' + email + ' to confirm your new email.' : 'Changes saved'); return; }
    void (async () => {
      try {
        await this.settle();
        const r = await this.api.changeEmail(email.trim());
        if (r.pending) { this.pendingEmail.set(r.email); this.toast('Changes saved. Check ' + r.email + ' to confirm your new email.'); }
        else { await this.load(); this.toast('Changes saved'); } // sin servicio de correo: cambiado al momento
      } catch (e) {
        this.toast(apiMessage(e), { kind: 'err' });
      }
    })();
  }
  setTheme(theme: 'Light' | 'Dark' | 'System'): void {
    this.mutate((d) => (d.user.theme = theme));
  }
  setAvatar(av: AppData['user']['av']): void {
    this.mutate((d) => (d.user.av = av));
    this.toast('Profile photo updated');
  }
  setLang(lang: string): void {
    this.mutate((d) => (d.user.lang = lang));
    this.toast(lang === 'English' ? 'Language changed to English.' : 'Language changed to ' + lang + '. This prototype is only in English.');
  }
  /** «Download my data»: descarga un archivo JSON con todo lo de la cuenta (sin la contraseña). */
  downloadData(): void {
    const d = this.data();
    const file = { exported: new Date().toISOString(), user: d.user, settings: this.settings(), team: d.team, gdds: d.gdds, notes: d.notes, sent: d.sent };
    const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-gdd-data-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.toast('Your data was downloaded');
  }
  /** «Log out of other devices» (de verdad: el servidor invalida los demás tokens). */
  async logoutOthers(): Promise<void> {
    if (!this.live()) { this.toast('You’re logged out of all other devices.'); return; } // selector de pantallas
    try {
      await this.api.logoutOthers();
      this.toast('You’re logged out of all other devices.');
    } catch (e) {
      this.toast(apiMessage(e), { kind: 'err' });
    }
  }
  /** Tus GDDs (los que puedes compartir con tu equipo). */
  ownGdds(): Gdd[] {
    return this.data().gdds.filter((g) => !g.share);
  }
  /** Acceso por defecto: todos tus GDDs con ese rol. */
  defaultGrants(role: 'Editor' | 'Viewer'): Grant[] {
    return this.ownGdds().map((g) => ({ g: g.id, role, depts: [] }));
  }
  invite(email: string, grants: Grant[]): void {
    const role = grants.some((x) => x.role === 'Editor') ? 'Editor' : 'Viewer';
    this.mutate((d) => d.team.invites.push({ id: nid(), email, role, grants }));
    this.toast('Invitation sent to ' + email);
  }
  /** Guarda a qué proyectos entra una persona del equipo, con qué rol y departamentos. */
  saveAccess(id: string, grants: Grant[]): void {
    let name = '';
    this.mutate((d) => { const m = d.team.members.find((x) => x.id === id); if (m) { m.grants = grants; m.role = grants.some((x) => x.role === 'Editor') ? 'Editor' : 'Viewer'; name = m.name; } });
    this.sheet.set(null);
    this.toast(name ? name + '’s access was saved' : 'Saved');
  }
  /** Aviso si hay que verificar el email antes de invitar o aceptar (true = parar). */
  needVerify(what: string): boolean {
    if (!this.verifyRequired()) return false;
    this.toast('Verify your email to ' + what + '. Check ' + this.data().user.email + '.', { action: { label: 'Send link', run: () => void this.resendVerify() } });
    return true;
  }
  async resendVerify(): Promise<void> {
    try {
      await this.api.resendVerify();
      this.toast('We sent a new link to ' + this.data().user.email);
    } catch (e) {
      this.toast(apiMessage(e), { kind: 'err' });
    }
  }
  async resendInvite(email: string): Promise<void> {
    if (!this.live()) { this.toast('Invitation sent again to ' + email); return; } // selector de pantallas
    try {
      const r = await this.api.resendInvite(email);
      this.toast(r.sent ? 'Invitation sent again to ' + email : email + ' will see your invitation in Notes when they log in.');
    } catch (e) {
      this.toast(apiMessage(e), { kind: 'err' });
    }
  }
  /** Aceptar o rechazar una invitación a un equipo. Al aceptar, aparecen sus GDDs. */
  async answerInvite(inv: Invitation, accept: boolean): Promise<void> {
    if (accept && this.needVerify('accept invitations')) return;
    try {
      await this.settle();
      await this.api.teamAction(inv.owner, accept ? 'accept' : 'decline');
      await this.load();
      this.toast(accept ? 'You joined ' + inv.name + '’s team' : 'Invitation declined', accept ? { kind: 'ok' } : {});
    } catch (e) {
      this.toast(apiMessage(e), { kind: 'err' });
      void this.load(); // la invitación pudo dejar de existir: se vuelve a mirar
    }
  }
  /** Salir del equipo de otra persona: dejas de ver sus GDDs. */
  async leaveTeam(t: TeamRef): Promise<void> {
    try {
      await this.settle();
      await this.api.teamAction(t.owner, 'leave');
      await this.load();
      this.toast('You left ' + t.name + '’s team');
    } catch (e) {
      this.toast(apiMessage(e), { kind: 'err' });
    }
  }
  cancelInvite(id: string): void {
    const v = this.data().team.invites.find((x) => x.id === id);
    this.mutate((d) => (d.team.invites = d.team.invites.filter((x) => x.id !== id)), true);
    this.toast('Invitation to ' + (v?.email ?? '') + ' canceled', { undo: true });
  }

  /** Vuelve a los datos de ejemplo (lo usa el selector de pantallas). */
  reset(empty = false): void {
    this.live.set(false);
    clearTimeout(this.syncTimer);
    const d = sampleData();
    if (empty) { d.gdds = []; d.notes = []; d.sent = []; }
    this.data.set(d);
    this.invitations.set([]);
    this.teams.set([]);
    this.mailOn.set(false);
    this.emailVerified.set(true);
    this.pendingEmail.set(null);
    this.loadErr.set(false);
    this.sheet.set(null);
    this.dialog.set(null);
    this.snack.set(null);
    this.dying.set(null);
    this.popped.set(null);
    this.homeIndex.set(0);
    this.notesTab.set('r');
    this.notesCollapsed.set({});
    this.drafts = {};
    this.undoData = null;
  }
}
