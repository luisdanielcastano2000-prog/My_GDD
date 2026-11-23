// Editor de un bloque: documento por secciones, aviso de revisión y barra flotante de formato.
import { Component, computed, inject, input, signal } from '@angular/core';
import { IonContent, IonHeader } from '@ionic/angular';

import { StoreService } from '../data/store.service';
import { NavService } from '../shared/nav.service';
import { TopBarComponent } from '../shared/ui';

@Component({
  selector: 'app-editor',
  imports: [IonHeader, IonContent, TopBarComponent],
  template: `
    <ion-header class="ed-header">
      <app-top-bar [title]="b()?.name ?? ''" [sub]="g()?.name ?? ''" [back]="'/gdd/' + gid() + '/dept/' + dpid()" />
    </ion-header>
    <ion-content class="page-editor">
      @if (b(); as blk) {
        <div class="editor">
          <p class="crumb">{{ dp()!.name }} › {{ blk.name }}</p>
          @if (revs().length) {
            <div class="rev-banner">
              <div class="head"><span class="lbl av sym" aria-hidden="true">!</span><h2>{{ revTitle() }}</h2></div>
              <button class="txt" type="button" [class.open]="revOpen()" [attr.aria-expanded]="revOpen()" (click)="revOpen.set(!revOpen())">{{ revText() }}</button>
              <div class="btn-row"><button class="btn btn-text" type="button" (click)="goSec()">Go to section</button></div>
            </div>
          } @else if (blk.pend) {
            <div class="banner-warn"><span class="lbl av sym" aria-hidden="true">!</span><span>This block may be affected by the latest change. Check it and mark it as reviewed.</span></div>
          }
          <article class="doc" [attr.aria-label]="blk.name + ' document'">
            @for (s of blk.secs; track s.id; let i = $index) {
              <section [id]="'sec-' + s.id" [class.rev]="s.rev">
                <div class="sec-head">
                  <input [value]="s.t" placeholder="Section title" [attr.aria-label]="'Title of section ' + (i + 1)" (focus)="fs.set(s.id)" (input)="store.setSec(blk.id, s.id, 't', $any($event.target).value)" />
                  @if (s.rev) { <span class="lbl av"><span>!</span>Needs review</span> }
                </div>
                <textarea [id]="'tx-' + s.id" [value]="s.x" placeholder="Start writing…" rows="3" [class.big]="s.big" [class.b]="s.b" [class.i]="s.i"
                  [attr.aria-label]="'Text of ' + (s.t || 'section ' + (i + 1))" (focus)="fs.set(s.id)" (input)="store.setSec(blk.id, s.id, 'x', $any($event.target).value)"></textarea>
              </section>
            }
            <button class="btn btn-text" type="button" style="align-self:flex-start;margin-left:-8px" (click)="addSec()"><span class="ms s18">add</span>Add section</button>
          </article>
        </div>

        <div class="toolbar" slot="fixed">
          <div class="tb" role="toolbar" [attr.aria-label]="'Formatting for ' + (cur()?.t || 'this section')">
            <button class="icon-btn" type="button" aria-label="Large text" [class.on]="!!cur()?.big" [attr.aria-pressed]="!!cur()?.big" (mousedown)="$event.preventDefault()" (click)="fmt('big')"><span class="ms">format_size</span></button>
            <button class="icon-btn" type="button" aria-label="Bold" [class.on]="!!cur()?.b" [attr.aria-pressed]="!!cur()?.b" (mousedown)="$event.preventDefault()" (click)="fmt('b')"><span class="ms">format_bold</span></button>
            <button class="icon-btn" type="button" aria-label="Italic" [class.on]="!!cur()?.i" [attr.aria-pressed]="!!cur()?.i" (mousedown)="$event.preventDefault()" (click)="fmt('i')"><span class="ms">format_italic</span></button>
            <button class="icon-btn" type="button" aria-label="Bulleted list" [class.on]="isList()" [attr.aria-pressed]="isList()" (mousedown)="$event.preventDefault()" (click)="fmt('list')"><span class="ms">format_list_bulleted</span></button>
          </div>
          <button class="fab icon-only" type="button" [attr.aria-label]="pending() ? 'Mark as reviewed' : 'Save'" (click)="save()">
            <span class="ms">{{ pending() ? 'done_all' : 'check' }}</span>
          </button>
        </div>
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
  protected fs = signal<string | null>(null); // sección con el foco
  protected revOpen = signal(false);
  protected cur = computed(() => { const b = this.b(); return b?.secs.find((s) => s.id === this.fs()) ?? b?.secs[0] ?? null; });
  protected revs = computed(() => this.b()?.secs.filter((s) => s.rev) ?? []);
  protected pending = computed(() => !!this.b()?.pend || this.revs().length > 0);
  protected isList = computed(() => { const x = this.cur()?.x; return !!x && x.split('\n').every((l) => l.startsWith('• ')); });
  protected revTitle = computed(() => { const r = this.revs(); return r.length === 1 ? (r[0].t || 'Untitled section') + ' needs review' : r.length + ' parts need review'; });
  protected revText = computed(() => {
    const clean = (t: string) => { const x = t.replace(/^Change:\s*/i, ''); return x.charAt(0).toUpperCase() + x.slice(1); };
    const r = this.revs();
    return r.length === 1 ? clean(r[0].chg) : r.map((s) => (s.t || 'Untitled section') + ': ' + clean(s.chg)).join(' · ');
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
    this.store.toast(msg, { kind: 'ok' });
  }
}
