// Notes (recibidas y enviadas) y New note.
import { Component, computed, inject, signal } from '@angular/core';
import { IonContent, IonHeader } from '@ionic/angular';

import type { Note, SentNote } from '../data/models';
import { StoreService } from '../data/store.service';
import { t, tn, TPipe } from '../i18n/i18n';
import { NavService } from '../shared/nav.service';
import { TopBarComponent } from '../shared/ui';
import { VerifyBannerComponent } from '../shared/verify-banner.component';

import { withLoading } from './auth.pages';

/** «Whole team, Animation» guardado en inglés → en el idioma de la app (los nombres de departamento no cambian). */
const toText = (to: string): string => to.split(', ').map((x) => (x === 'Whole team' ? t('Whole team') : x)).join(', ');

interface Row { id: string; kind: 'change' | 'team' | 'sent'; icon: string; title: string; sub: string; unread: boolean; aria: string }

@Component({
  selector: 'app-notes',
  imports: [TPipe, IonHeader, IonContent, TopBarComponent, VerifyBannerComponent],
  template: `
    <ion-header class="cards">
      <app-top-bar [title]="'Notes' | t" />
      <div class="tabs" role="tablist">
        <button type="button" role="tab" [class.on]="tab() === 'r'" [attr.aria-selected]="tab() === 'r'" (click)="store.notesTab.set('r')">{{ 'Received' | t }}</button>
        <button type="button" role="tab" [class.on]="tab() === 's'" [attr.aria-selected]="tab() === 's'" (click)="store.notesTab.set('s')">{{ 'Sent' | t }}</button>
      </div>
    </ion-header>
    <ion-content class="page-cards">
      <div class="page with-fab" style="padding-left:12px;padding-right:12px;gap:12px">
        @if (store.invitations().length) { <app-verify-banner /> }
        @if (tab() === 'r' && store.invitations().length) {
          <section class="nt-sec card" [attr.aria-label]="'Invitations' | t">
            <div class="nt-head"><span class="name">{{ 'Invitations' | t }}<span class="new"> {{ '· {p0} new' | t: { p0: store.invitations().length } }}</span></span></div>
            <ul class="list plain">
        @for (v of store.invitations(); track v.owner) {
          <li class="invite-li">
            <span class="setting" style="padding:0;min-height:0">
              <span class="ms ic-muted">group_add</span>
              <span class="li-text"><span class="li-title">{{ '{p0} invited you to their team' | t: { p0: v.name } }}</span><span class="li-sub">{{ v.projects?.length ? ((v.projects.length === 1 ? 'Project: {list} · ' : 'Projects: {list} · ') | t: { list: v.projects.join(', ') }) : '' }}{{ (v.role === 'Viewer' ? 'You’ll read and send notes.' : 'You’ll write and send notes.') | t }}</span></span>
            </span>
            <span class="btn-row">
              <button class="btn btn-text" type="button" (click)="store.answerInvite(v, false)">{{ 'Decline' | t }}</button>
              <button class="btn btn-filled" type="button" (click)="store.answerInvite(v, true)">{{ 'Accept' | t }}</button>
            </span>
          </li>
        }
            </ul>
          </section>
        }
        @for (gr of groups(); track gr.id) {
          <section class="nt-sec card" [class.fade-in]="true">
            <button class="nt-head" type="button" [attr.aria-expanded]="gr.open" (click)="toggle(gr.id)">
              <span class="name">{{ gr.name }}@if (gr.nNew) { <span class="new"> {{ '· {p0} new' | t: { p0: gr.nNew } }}</span> }</span>
              <span class="ms ic-muted">{{ gr.open ? 'expand_less' : 'expand_more' }}</span>
            </button>
            @if (gr.open) {
              <ul class="nt-list">
                @for (it of gr.items; track it.id) {
                  <li class="nt-li" [class.slide-out]="store.dying() === it.id" [attr.data-flip]="it.id">
                    <button class="li" type="button" [class.unread]="it.unread" [attr.aria-label]="it.aria" (click)="open(it)">
                      <span class="nt-ic" [class]="'nt-ic ' + it.kind"><span class="ms s20">{{ it.icon }}</span></span>
                      <span class="li-text"><span class="li-title">{{ it.title }}</span><span class="li-sub">{{ it.sub }}</span></span>
                    </button>
                    <button class="icon-btn" type="button" [attr.aria-label]="'More options for this note' | t" (click)="more(it)"><span class="ms">more_vert</span></button>
                  </li>
                }
              </ul>
            }
          </section>
        } @empty {
          @if (tab() === 'r') {
            @if (!store.invitations().length) {
            <div class="empty">
              <span class="ms">inbox</span>
              <h2 class="t-headline-small">{{ 'No notes yet' | t }}</h2>
              <p>{{ 'Changes and team notes of your GDDs will appear here.' | t }}</p>
            </div>
            }
          } @else {
            <div class="empty">
              <span class="ms">send</span>
              <h2 class="t-headline-small">{{ 'No sent notes' | t }}</h2>
              <p>{{ 'Notes you send to your team will appear here.' | t }}</p>
            </div>
          }
        }
      </div>
      <button class="fab" slot="fixed" type="button" (click)="newNote()"><span class="ms">add</span>{{ 'New note' | t }}</button>
    </ion-content>
  `,
})
export class NotesPage {
  protected store = inject(StoreService);
  private nav = inject(NavService);
  protected tab = this.store.notesTab;
  protected groups = computed(() => {
    const d = this.store.data();
    const col = this.store.notesCollapsed();
    const r = this.tab() === 'r';
    // Notas del equipo que no son de un GDD tuyo (te las envía otra persona): grupo aparte
    const mine = new Set(d.gdds.map((g) => g.id));
    const fromTeam = r ? d.notes.filter((n) => !n.g || !mine.has(n.g)).sort((a, b) => b.ts - a.ts).map((n) => this.noteRow(n)) : [];
    const extra = fromTeam.length ? [{ id: 'team', name: t('From your team'), items: fromTeam, open: !col['team'], nNew: d.notes.filter((n) => (!n.g || !mine.has(n.g)) && n.unread).length }] : [];
    return [...extra, ...d.gdds
      .map((g) => {
        const items: Row[] = r
          ? d.notes.filter((n) => n.g === g.id).sort((a, b) => b.ts - a.ts).map((n) => this.noteRow(n))
          : d.sent.filter((n) => (n.g ?? d.gdds[0]?.id) === g.id).sort((a, b) => b.ts - a.ts).map((n) => this.sentRow(n));
        const key = (r ? '' : 's') + g.id;
        return { id: key, name: g.name, items, open: !col[key], nNew: r ? d.notes.filter((n) => n.g === g.id && n.unread).length : 0 };
      })
      .filter((x) => x.items.length)];
  });

  private noteRow(n: Note): Row {
    const when = this.store.when(n.ts, n.when);
    // Las notas que llegan del equipo traen path «From: Ana»: no repetir el nombre («Ana, Ana»)
    const from = n.kind === 'team' && n.by ? (n.path.startsWith('From: ') ? n.by : n.by + ', ' + n.path) : n.path;
    return {
      id: n.id, kind: n.kind, icon: n.kind === 'change' ? 'warning' : 'chat', title: n.title, unread: n.unread,
      sub: when + ' · ' + from,
      aria: t(n.kind === 'change' ? 'Change in your GDD: {title}, {from}, {when}. Review' : 'Team note: {title}, {from}, {when}. Review', { title: n.title, from, when }),
    };
  }
  private sentRow(n: SentNote): Row {
    const when = this.store.when(n.ts, n.when);
    const marked = n.aff?.length ? ' · ' + tn(n.aff.length, '{n} block marked out of date', '{n} blocks marked out of date') : '';
    const to = toText(n.to);
    return { id: n.id, kind: 'sent', icon: 'send', title: '“' + n.text + '”', sub: when + ' · ' + t('To: {to}', { to }) + marked, unread: false, aria: t('Sent to {to}: {text}, {when}', { to, text: n.text, when }) + marked };
  }
  toggle(id: string): void {
    this.store.notesCollapsed.update((c) => ({ ...c, [id]: !c[id] }));
  }
  open(it: Row): void {
    if (it.kind === 'sent') { this.more(it); return; }
    const n = this.store.data().notes.find((x) => x.id === it.id);
    if (!n) return;
    if (n.kind === 'change') { this.nav.go('/gdd/' + n.g + '/review/' + n.id); return; }
    if (!this.store.gdd(n.g)) { this.more(it); return; } // nota sin GDD que puedas abrir: solo sus opciones
    const dp = this.store.dept(this.store.gdd(n.g), n.dp);
    this.nav.go(dp ? '/gdd/' + n.g + '/dept/' + dp.id : '/gdd/' + n.g);
  }
  more(it: Row): void {
    const sent = this.store.data().sent.find((x) => x.id === it.id);
    this.store.sheet.set({ k: 'note', kind: it.kind, id: it.id, title: sent ? t('To: {to}', { to: toText(sent.to) }) : it.title });
  }
  newNote(): void {
    this.nav.go('/notes/new');
  }
}

@Component({
  selector: 'app-new-note',
  imports: [TPipe, IonHeader, IonContent, TopBarComponent],
  template: `
    <ion-header><app-top-bar [title]="'New note' | t" back="/notes" /></ion-header>
    <ion-content>
      @if (!store.data().gdds.length) {
        <div class="empty">
          <span class="ms">sticky_note_2</span>
          <h2 class="t-headline-small">{{ 'Create a GDD first' | t }}</h2>
          <p>{{ 'Notes always point to a project, a department or a block.' | t }}</p>
          <button class="btn btn-filled m" type="button" (click)="nav.go('/new-gdd')"><span class="ms">add</span>{{ 'New GDD' | t }}</button>
        </div>
      } @else {
        <form class="page with-nav" (submit)="$event.preventDefault(); send()" novalidate>
          <div class="field" [class.error]="err()">
            <div class="field-box">
              <label for="nn-text">{{ 'Note' | t }}</label>
              <textarea id="nn-text" [value]="text()" (input)="text.set($any($event.target).value); err.set(false)"></textarea>
            </div>
            @if (err()) { <span class="field-error">{{ 'Write the note before sending it.' | t }}</span> }
          </div>
          <h2 class="section-title" style="padding:0">{{ 'Where does this note go?' | t }}</h2>
          <div class="field">
            <div class="field-box">
              <label for="nn-g">{{ '1 · Project' | t }}</label>
              <select id="nn-g" [value]="g()?.id" (change)="gid.set($any($event.target).value); dpid.set(null); bid.set(null); aff.set([])">
                @for (o of store.data().gdds; track o.id) { <option [value]="o.id" [selected]="o.id === g()?.id">{{ o.name }}</option> }
              </select>
              <span class="ms sel-ic">arrow_drop_down</span>
            </div>
          </div>
          <div class="field">
            <div class="field-box">
              <label for="nn-dp">{{ '2 · Department' | t }}</label>
              <select id="nn-dp" [disabled]="!dp()" (change)="dpid.set($any($event.target).value); bid.set(null)">
                @if (!dp()) { <option>{{ 'No departments yet' | t }}</option> }
                @for (o of g()?.depts ?? []; track o.id) { <option [value]="o.id" [selected]="o.id === dp()?.id">{{ o.name }}</option> }
              </select>
              <span class="ms sel-ic">arrow_drop_down</span>
            </div>
          </div>
          <div class="field">
            <div class="field-box">
              <label for="nn-b">{{ '3 · Block' | t }}</label>
              <select id="nn-b" (change)="bid.set($any($event.target).value || null)">
                <option value="" [selected]="!b()">{{ 'Whole department' | t }}</option>
                @for (o of dp()?.blocks ?? []; track o.id) { <option [value]="o.id" [selected]="o.id === b()?.id">{{ o.name }}</option> }
              </select>
              <span class="ms sel-ic">arrow_drop_down</span>
            </div>
          </div>
          <p class="where"><span class="ms s20">layers</span>{{ path() }}</p>
          <!-- Bloques afectados: se marcan «Out of date» para todo el equipo hasta que alguien los revise -->
          <button class="li tall aff-toggle card" type="button" [attr.aria-expanded]="affOpen()" (click)="affOpen.set(!affOpen())">
            <span class="ms ic-muted">{{ aff().length ? 'warning' : 'rule' }}</span>
            <span class="li-text"><span class="li-title">{{ 'Blocks affected by this change' | t }}</span><span class="li-sub">{{ aff().length ? ((aff().length === 1 ? '{n} block will be marked out of date for the team' : '{n} blocks will be marked out of date for the team') | t: { n: aff().length }) : ('Optional · Mark the blocks the team should review' | t) }}</span></span>
            <span class="ms li-trail">{{ affOpen() ? 'expand_less' : 'expand_more' }}</span>
          </button>
          @if (affOpen()) {
            @for (d of affDepts(); track d.id) {
              <h3 class="group-title" style="padding:4px 4px 0">{{ d.name }}</h3>
              <ul class="list card">
                @for (x of d.blocks; track x.id) {
                  <li>
                    <button class="li" type="button" role="checkbox" [attr.aria-checked]="aff().includes(x.id)" (click)="flipAff(x.id)">
                      <span class="check" [class.on]="aff().includes(x.id)">@if (aff().includes(x.id)) { <span class="ms">check</span> }</span>
                      <span class="li-text"><span class="li-title">{{ x.name }}</span>@if (x.status === 'Out of date') { <span class="li-sub">{{ 'Already out of date' | t }}</span> }</span>
                    </button>
                  </li>
                }
              </ul>
            } @empty { <p class="li-sub" style="padding:0 4px">{{ 'This project has no other blocks yet.' | t }}</p> }
          }
          <h2 class="section-title" style="padding:0">{{ 'Send to' | t }}</h2>
          <div class="chips">
            <button class="chip" type="button" [class.on]="cTeam()" [attr.aria-pressed]="cTeam()" (click)="cTeam.set(!cTeam())">@if (cTeam()) { <span class="ms">check</span> }{{ 'Whole team' | t }}</button>
            @if (dp(); as d) {
              <button class="chip" type="button" [class.on]="cDep()" [attr.aria-pressed]="cDep()" (click)="cDep.set(!cDep())">@if (cDep()) { <span class="ms">check</span> }{{ d.name }}</button>
            }
          </div>
          <button class="btn btn-filled m block" type="submit" [class.ok]="phase() === 'ok'" [attr.aria-busy]="!!phase()">
            @switch (phase()) {
              @case ('load') { <span class="spin"></span>{{ 'Sending note' | t }} }
              @case ('ok') { <span class="ms">check</span>{{ 'Note sent' | t }} }
              @default { {{ 'Send note' | t }} }
            }
          </button>
        </form>
      }
    </ion-content>
  `,
})
export class NewNotePage {
  protected store = inject(StoreService);
  protected nav = inject(NavService);
  private d = this.store.takeDraft('newnote', { text: '', g: null as string | null, dp: null as string | null, b: null as string | null, err: false, sendError: false });
  protected text = signal(this.d.text);
  protected err = signal(this.d.err);
  protected gid = signal(this.d.g);
  protected dpid = signal(this.d.dp);
  protected bid = signal(this.d.b);
  protected cTeam = signal(true);
  protected aff = signal<string[]>([]); // bloques afectados
  protected affOpen = signal(false);
  /** Bloques que se pueden marcar: todos los del GDD menos el de la nota. */
  protected affDepts = computed(() => (this.g()?.depts ?? []).map((d) => ({ id: d.id, name: d.name, blocks: d.blocks.filter((x) => x.id !== this.b()?.id) })).filter((d) => d.blocks.length));
  protected cDep = signal(true);
  protected phase = signal<'' | 'load' | 'ok'>('');
  protected g = computed(() => this.store.gdd(this.gid()) ?? this.store.data().gdds.at(0) ?? null);
  protected dp = computed(() => this.store.dept(this.g(), this.dpid()) ?? this.g()?.depts.at(0) ?? null);
  protected b = computed(() => this.dp()?.blocks.find((x) => x.id === this.bid()) ?? null);
  protected path = computed(() => (this.g()?.name ?? '') + (this.dp() ? ' › ' + this.dp()!.name : '') + (this.b() ? ' › ' + this.b()!.name : ''));

  constructor() {
    // Estado «no se pudo enviar» (selector de pantallas): snackbar de error con Retry
    if (this.d.sendError) {
      setTimeout(() => this.store.toast(t('Your note couldn’t be sent. Check your connection.'), { kind: 'err', action: { label: t('Retry'), run: () => this.send() } }), 50);
    }
  }
  flipAff(id: string): void {
    this.aff.update((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  }
  send(): void {
    const t = this.text().trim();
    if (!t) { this.err.set(true); return; }
    const ok = new Set(this.affDepts().flatMap((d) => d.blocks.map((x) => x.id))); // si cambió de proyecto, solo los de este
    withLoading(this.store, this.phase, () => {
      this.store.sendNote(t, this.g()!.id, this.dp()?.id ?? null, this.cTeam(), this.cDep(), this.b()?.id ?? null, this.aff().filter((x) => ok.has(x)));
      this.nav.back('/notes');
    });
  }
}
