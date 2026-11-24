import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

import { ApiService, apiMessage } from './api.service';
import type { AppData, Block, Dept, Dialog, Gdd, Note, Sheet, Snack } from './models';
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
  readonly loadErr = signal(false);
  readonly sheet = signal<Sheet | null>(null);
  readonly dialog = signal<Dialog | null>(null);
  readonly snack = signal<Snack | null>(null);
  readonly dying = signal<string | null>(null); // id de lo que se está borrando (animación)
  readonly popped = signal<string | null>(null); // id de lo recién creado (animación)
  readonly homeIndex = signal(0);
  readonly notesTab = signal<'r' | 's'>('r');
  readonly notesCollapsed = signal<Record<string, boolean>>({});
  readonly settings = signal<Settings>({ ...DEFAULT_SETTINGS });
  readonly systemDark = signal(typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches);
  /** Valores iniciales de formularios (los usa el selector de pantallas para abrir un estado concreto). */
  private drafts: Record<string, Record<string, unknown>> = {};
  private undoData: AppData | null = null;
  private snackTimer: ReturnType<typeof setTimeout> | undefined;

  readonly dark = computed(() => {
    const t = this.data().user.theme;
    return t === 'Dark' || (t === 'System' && this.systemDark());
  });
  /** La hora actual, cada minuto: hace que «5 min ago» avance solo. */
  readonly now = signal(Date.now());
  /** Fecha de alta de la cuenta (la da el servidor). */
  readonly since = signal<number | null>(null);
  readonly unread = computed(() => this.data().notes.filter((n) => n.unread).length);

  constructor() {
    setInterval(() => this.now.set(Date.now()), 60_000);
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
      root.classList.toggle('motion-slow', s.slowMotion);
      const ts = s.textSize === 'Larger' ? 1.4 : s.textSize === 'Large' ? 1.2 : 1;
      root.style.setProperty('--gdd-ts', String(ts));
      if (ts > 1) root.classList.add(ts > 1.3 ? 'ts-larger' : 'ts-large');
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
      const d: AppData = { gdds: r.gdds, notes: r.notes, sent: r.sent, user: r.user, team: r.team };
      this.data.set(d);
      this.since.set(r.since ? Date.parse(r.since) : null);
      this.snapshot = structuredClone(d);
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
    cur.gdds.forEach((g, i) => {
      const o = old.gdds.findIndex((x) => x.id === g.id);
      if (o !== i || !same(old.gdds[o], g)) jobs.push(this.api.saveGdd(g, i));
    });
    old.gdds.filter((g) => !cur.gdds.some((x) => x.id === g.id)).forEach((g) => jobs.push(this.api.deleteGdd(g.id)));
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
    if (!same(old.team, cur.team)) jobs.push(this.api.saveTeam(cur.team));
    try {
      await Promise.all(jobs);
      this.snapshot = structuredClone(cur);
      this.savedSettings = sk;
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 401) { this.logout(); location.assign('/login'); return; }
      this.toast(e instanceof HttpErrorResponse && e.status === 400 ? apiMessage(e) : 'Your change couldn’t be saved.', { kind: 'err', action: { label: 'Retry', run: () => void this.sync() } });
    } finally {
      this.syncing = false;
      if (this.syncAgain) { this.syncAgain = false; void this.sync(); }
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
    if (this.undoData) { this.data.set(this.undoData); this.scheduleSync(); }
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
    const ms = this.settings().reduceMotion ? 0 : 420 * (this.settings().slowMotion ? 4 : 1);
    this.dying.set(id);
    setTimeout(() => { fn(); this.dying.set(null); }, ms);
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
    const dp0 = this.dept(this.gdd(gid), dpid);
    if (!dp0) return;
    const name = this.uniq('New block', dp0.blocks.map((x) => x.name));
    const nb = mkBlock(name, '');
    this.mutate((d) => { const g = d.gdds.find((x) => x.id === gid)!; g.depts.find((x) => x.id === dpid)!.blocks.push(nb); touch(g); });
    this.pop(nb.id);
    this.toast(name + ' created');
  }
  useTemplate(gid: string): void {
    const t = buildGdd('x', 'Minimal', [0, 2, 3, 5]);
    this.mutate((d) => { const g = d.gdds.find((x) => x.id === gid)!; g.depts = g.depts.concat(t.depts); touch(g); });
    this.toast('Minimal template added: 4 departments');
  }
  suggest(gid: string, dpid: string): void {
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
    this.mutate((d) => { const s = this.where(bid, d)?.b.secs.find((x) => x.id === sid); if (s) s[key] = v; });
  }
  fmtSec(bid: string, sid: string, key: 'big' | 'b' | 'i' | 'list'): void {
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
    this.mutate((d) => this.where(bid, d)?.b.secs.push(s));
    return s.id;
  }
  /** Guarda el bloque: si estaba pendiente de revisar, queda revisado. Devuelve el mensaje del snackbar. */
  save(bid: string): string {
    let msg = '';
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
  /** Lista donde está el elemento de una hoja de acciones (para mover y borrar). */
  private listOf(d: AppData, sh: Extract<Sheet, { k: 'act' }>): { id: string; name: string }[] {
    if (sh.what === 'gdd') return d.gdds;
    const g = d.gdds.find((x) => x.id === sh.g);
    if (sh.what === 'dept') return g?.depts ?? [];
    return g?.depts.find((x) => x.id === sh.dp)?.blocks ?? [];
  }
  actIndex(sh: Extract<Sheet, { k: 'act' }>): { idx: number; len: number; name: string } {
    const arr = this.listOf(this.data(), sh);
    const idx = arr.findIndex((x) => x.id === sh.id);
    return { idx, len: arr.length, name: idx >= 0 ? arr[idx].name : '' };
  }
  move(sh: Extract<Sheet, { k: 'act' }>, dir: -1 | 1): void {
    this.mutate((d) => {
      const arr = this.listOf(d, sh);
      const i = arr.findIndex((x) => x.id === sh.id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      if (sh.what === 'gdd') this.homeIndex.set(j);
    });
    this.sheet.set(null);
  }
  askDelete(sh: Extract<Sheet, { k: 'act' }>): void {
    this.sheet.set(null);
    if (sh.what === 'block') this.deleteBlock(sh.id);
    else if (sh.what === 'dept') this.deleteDept(sh.id, sh.g!);
    else this.dialog.set({ k: 'del', what: 'gdd', id: sh.id });
  }
  deleteBlock(bid: string): void {
    const w = this.where(bid);
    if (!w) return;
    this.afterDissolve(bid, () => {
      this.mutate((d) => { const x = this.where(bid, d)!; x.dp.blocks = x.dp.blocks.filter((b) => b.id !== bid); touch(x.g); }, true);
      this.toast(w.b.name + ' deleted', { undo: true });
    });
  }
  deleteDept(did: string, gid: string): void {
    const dp = this.dept(this.gdd(gid), did);
    if (!dp) return;
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
        this.mutate((d) => { d.gdds = d.gdds.filter((x) => x.id !== dl.id); d.notes = d.notes.filter((n) => n.g !== dl.id); });
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
  sendNote(text: string, gid: string, dpid: string | null, cTeam: boolean, cDep: boolean): void {
    this.mutate((d) => {
      const g = d.gdds.find((x) => x.id === gid) ?? d.gdds[0];
      const dp = g.depts.find((x) => x.id === dpid) ?? g.depts[0] ?? null;
      const to: string[] = [];
      if (cTeam) to.push('Whole team');
      if (dp && cDep) to.push(dp.name);
      d.sent.push({ id: nid(), g: g.id, text, to: to.length ? to.join(', ') : 'Whole team', when: 'Just now', ts: Date.now() });
    });
    this.notesTab.set('s');
    this.toast('Note sent', { kind: 'ok' });
  }
  notify(n: Note | null): void {
    this.mutate((d) => d.sent.push({ id: nid(), g: n?.g, text: 'Please review: ' + (n ? n.title : 'the latest change'), to: 'Whole team', when: 'Just now', ts: Date.now() }));
    this.toast('Team notified');
  }

  // ---------- perfil y equipo ----------
  saveProfile(name: string, user: string, email: string, theme: 'Light' | 'Dark' | 'System', accent: string): void {
    const changed = email !== this.data().user.email;
    this.mutate((d) => {
      d.user.name = name;
      d.user.user = user.trim().replace(/^@/, '') || d.user.user;
      d.user.email = email;
      d.user.theme = theme;
      d.user.accent = accent;
      const me = d.team.members.find((x) => x.you);
      if (me) { me.name = name; me.email = email; }
    });
    this.toast(changed ? 'Changes saved. Check ' + email + ' to confirm your new email.' : 'Changes saved');
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
  invite(email: string, role: 'Editor' | 'Viewer'): void {
    this.mutate((d) => d.team.invites.push({ id: nid(), email, role }));
    this.toast('Invitation sent to ' + email);
  }
  saveRole(id: string, role: 'Editor' | 'Viewer' | 'Owner'): void {
    let name = '';
    this.mutate((d) => { const m = d.team.members.find((x) => x.id === id); if (m) { m.role = role; name = m.name; } });
    this.sheet.set(null);
    this.toast(name ? name + ' is now ' + role.toLowerCase() : 'Saved');
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
