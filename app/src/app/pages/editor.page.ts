// Editor de un bloque: documento por secciones, aviso de revisión y barra flotante de formato.
import { Component, computed, inject, input, signal } from '@angular/core';
import { IonContent, IonHeader } from '@ionic/angular';

import { StoreService } from '../data/store.service';
import { t, TPipe } from '../i18n/i18n';
import { NavService } from '../shared/nav.service';
import { TopBarComponent } from '../shared/ui';

@Component({
  selector: 'app-editor',
  imports: [TPipe, IonHeader, IonContent, TopBarComponent],
  template: `
    <ion-header class="ed-header">
      <app-top-bar [title]="b()?.name ?? ''" [sub]="g()?.name ?? ''" [back]="'/gdd/' + gid() + '/dept/' + dpid()" />
    </ion-header>
    <ion-content class="page-editor">
      @if (b(); as blk) {
        <div class="editor">
          <p class="crumb">{{ dp()!.name }} › {{ blk.name }}</p>
          @if (!edit()) {
            <div class="banner-warn"><span class="ms s20" aria-hidden="true">visibility</span><span>{{ 'Shared by {p0} · {p1}' | t: { p0: g()?.share?.name, p1: readWhy() } }}</span></div>
          }
          @if (revs().length) {
            <div class="rev-banner">
              <div class="head"><span class="lbl av sym" aria-hidden="true">!</span><h2>{{ revTitle() }}</h2></div>
              <button class="txt" type="button" [class.open]="revOpen()" [attr.aria-expanded]="revOpen()" (click)="revOpen.set(!revOpen())">{{ revText() }}</button>
              <div class="btn-row"><button class="btn btn-text" type="button" (click)="goSec()">{{ 'Go to section' | t }}</button></div>
            </div>
          } @else if (blk.pend) {
            <div class="banner-warn"><span class="lbl av sym" aria-hidden="true">!</span><span>{{ 'This block may be affected by the latest change. Check it and mark it as reviewed.' | t }}</span></div>
          }
          <article class="doc" [attr.aria-label]="blk.name + ' document'">
            @for (s of blk.secs; track s.id; let i = $index) {
              <section [id]="'sec-' + s.id" [class.rev]="s.rev">
                <div class="sec-head">
                  <input [value]="s.t" [placeholder]="'Section title' | t" [readOnly]="!edit()" [attr.aria-label]="'Title of section {n}' | t: { n: i + 1 }" (focus)="fs.set(s.id)" (input)="store.setSec(blk.id, s.id, 't', $any($event.target).value)" />
                  @if (s.rev) { <span class="lbl av"><span>!</span>{{ 'Needs review' | t }}</span> }
                </div>
                <textarea [id]="'tx-' + s.id" [value]="s.x" [placeholder]="edit() ? ('Start writing…' | t) : ''" [readOnly]="!edit()" rows="3" [class.big]="s.big" [class.b]="s.b" [class.i]="s.i"
                  [attr.aria-label]="s.t ? ('Text of {name}' | t: { name: s.t }) : ('Text of section {n}' | t: { n: i + 1 })" (focus)="fs.set(s.id)" (input)="store.setSec(blk.id, s.id, 'x', $any($event.target).value)"></textarea>
              </section>
            }
            @if (edit()) { <button class="btn btn-text" type="button" style="align-self:flex-start;margin-left:-8px" (click)="addSec()"><span class="ms s18">add</span>{{ 'Add section' | t }}</button> }
          </article>
        </div>

        @if (edit()) {
        <div class="toolbar" slot="fixed">
          <div class="tb" role="toolbar" [attr.aria-label]="cur()?.t ? ('Formatting for {name}' | t: { name: cur()?.t }) : ('Formatting for this section' | t)">
            <button class="icon-btn" type="button" [attr.aria-label]="'Large text' | t" [class.on]="!!cur()?.big" [attr.aria-pressed]="!!cur()?.big" (mousedown)="$event.preventDefault()" (click)="fmt('big')"><span class="ms">format_size</span></button>
            <button class="icon-btn" type="button" [attr.aria-label]="'Bold' | t" [class.on]="!!cur()?.b" [attr.aria-pressed]="!!cur()?.b" (mousedown)="$event.preventDefault()" (click)="fmt('b')"><span class="ms">format_bold</span></button>
            <button class="icon-btn" type="button" [attr.aria-label]="'Italic' | t" [class.on]="!!cur()?.i" [attr.aria-pressed]="!!cur()?.i" (mousedown)="$event.preventDefault()" (click)="fmt('i')"><span class="ms">format_italic</span></button>
            <button class="icon-btn" type="button" [attr.aria-label]="'Bulleted list' | t" [class.on]="isList()" [attr.aria-pressed]="isList()" (mousedown)="$event.preventDefault()" (click)="fmt('list')"><span class="ms">format_list_bulleted</span></button>
          </div>
          <button class="fab icon-only" type="button" [attr.aria-label]="(pending() ? 'Mark as reviewed' : 'Save') | t" (click)="save()">
            <span class="ms">{{ pending() ? 'done_all' : 'check' }}</span>
          </button>
        </div>
        }
      }
    </ion-content>
  `,
})
export class EditorPage {
  protected store = inject(StoreService);
  private nav = inject(NavService);
  readonly gid = input.required<string>();
  readonly dpid = input.required<string>();
  readonly bid = input.required<string>();
  protected g = computed(() => this.store.gdd(this.gid()));
  protected dp = computed(() => this.store.dept(this.g(), this.dpid()));
  protected b = computed(() => this.dp()?.blocks.find((x) => x.id === this.bid()) ?? null);
  protected edit = computed(() => this.store.canEditDept(this.gid(), this.dpid())); // Viewer o departamento ajeno: solo leer
  /** Por qué solo puedes leer (Viewer, o Editor de otros departamentos). */
  protected readWhy = computed(() => t(this.store.role(this.gid()) === 'Viewer' ? 'You can read this block. To suggest a change, send a note.' : 'You edit other departments. To suggest a change here, send a note.'));
  protected fs = signal<string | null>(null); // sección con el foco
  protected revOpen = signal(false);
  protected cur = computed(() => { const b = this.b(); return b?.secs.find((s) => s.id === this.fs()) ?? b?.secs[0] ?? null; });
  protected revs = computed(() => this.b()?.secs.filter((s) => s.rev) ?? []);
  protected pending = computed(() => !!this.b()?.pend || this.revs().length > 0);
  protected isList = computed(() => { const x = this.cur()?.x; return !!x && x.split('\n').every((l) => l.startsWith('• ')); });
  protected revTitle = computed(() => { const r = this.revs(); return r.length === 1 ? t('{name} needs review', { name: r[0].t || t('Untitled section') }) : t('{n} parts need review', { n: r.length }); });
  protected revText = computed(() => {
    const clean = (t: string) => { const x = t.replace(/^Change:\s*/i, ''); return x.charAt(0).toUpperCase() + x.slice(1); };
    const r = this.revs();
    return r.length === 1 ? clean(r[0].chg) : r.map((s) => (s.t || t('Untitled section')) + ': ' + clean(s.chg)).join(' · ');
  });

  goSec(): void {
    const r = this.revs()[0];
    if (r) document.getElementById('sec-' + r.id)?.scrollIntoView({ behavior: this.store.settings().reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }
  fmt(key: 'big' | 'b' | 'i' | 'list'): void {
    const s = this.cur();
    if (s) { this.store.fmtSec(this.bid(), s.id, key); this.fs.set(s.id); }
  }
  addSec(): void {
    const id = this.store.addSec(this.bid());
    this.fs.set(id);
    setTimeout(() => document.getElementById('tx-' + id)?.focus());
  }
  save(): void {
    const msg = this.store.save(this.bid());
    if (!msg) return; // no puedes editar este bloque (ya lo avisó el store)
    // Si el cambio puede afectar a otros bloques, avisar al equipo y marcarlos con un toque
    this.store.toast(msg, { kind: 'ok', action: { label: t('Note a change'), run: () => { this.store.setDraft('newnote', { g: this.gid(), dp: this.dpid(), b: this.bid() }); this.nav.go('/notes/new'); } } });
  }
}
