// Home (carrusel de GDDs) y Create template (nuevo GDD).
import type { AfterViewInit, ElementRef} from '@angular/core';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { IonContent, IonHeader } from '@ionic/angular';

import type { Gdd } from '../data/models';
import { CATALOG, TEMPLATE_DEPTS, type Template } from '../data/sample';
import { StoreService } from '../data/store.service';
import { NavService } from '../shared/nav.service';
import { StatusComponent, TopBarComponent } from '../shared/ui';

const CARD_STEP = 294; // ancho de tarjeta (286) + separación (8)

@Component({
  selector: 'app-home',
  imports: [IonHeader, IonContent, TopBarComponent, StatusComponent],
  template: `
    <ion-header class="cards"><app-top-bar [brand]="true" /></ion-header>
    <ion-content class="page-cards">
      @if (store.loadErr()) {
        <div class="empty">
          <span class="ms">info</span>
          <h2 class="t-headline-small">We couldn’t load your GDDs</h2>
          <p>Check your connection and try again.</p>
          <button class="btn btn-filled m" type="button" (click)="store.load()"><span class="ms">refresh</span>Retry</button>
        </div>
      } @else if (!gdds().length) {
        <div class="empty">
          <span class="ms">sports_esports</span>
          <h2 class="t-headline-small">You don’t have any GDD yet</h2>
          <p>Start with a template that fits your project.</p>
          <button class="btn btn-filled m" type="button" (click)="nav.go('/new-gdd')"><span class="ms">add</span>New GDD</button>
        </div>
      } @else {
        <div class="home">
          <div #car class="carousel" (scroll)="onScroll($any($event.target))" aria-label="Your GDDs" role="list">
            @for (g of cards(); track g.id) {
              <div class="gdd-card" role="listitem" [class.pop-in]="store.popped() === g.id" [class.dissolve]="store.dying() === g.id">
                <button class="open" type="button" [attr.aria-label]="'Open ' + g.name + ', ' + g.st.t" (click)="nav.go('/gdd/' + g.id)"></button>
                <span class="band"><span class="ms">sports_esports</span></span>
                <button class="icon-btn more" type="button" [attr.aria-label]="'More options for ' + g.name" (click)="store.sheet.set({ k: 'act', what: 'gdd', id: g.id })"><span class="ms">more_vert</span></button>
                <span class="body">
                  <span class="name">{{ g.name }}</span>
                  <span class="desc">{{ g.desc }}</span>
                  <span class="spacer"></span>
                  @if (g.st.k === 'old') {
                    <span><button class="chip-warn" type="button" [attr.aria-label]="'Show the ' + g.st.t + ' in ' + g.name" (click)="nav.go('/gdd/' + g.id + '/outdated')"><span class="lbl av sym" aria-hidden="true">!</span>{{ g.st.t }}<span class="ms">chevron_right</span></button></span>
                  } @else {
                    <span class="status"><app-status [kind]="g.st.k" [text]="g.st.t" /></span>
                  }
                  <span class="meta">{{ g.updated }}</span>
                </span>
              </div>
            }
          </div>
          @if (gdds().length > 1) {
            <div class="dots" role="img" [attr.aria-label]="'Project ' + (idx() + 1) + ' of ' + gdds().length">
              @for (g of gdds(); track g.id; let i = $index) { <span [class.on]="i === idx()"></span> }
            </div>
          }
          @if (cont(); as c) {
            <button class="continue card" type="button" [attr.aria-label]="'Continue writing ' + c.name + ', ' + c.sub" (click)="nav.go(c.url)">
              <span class="ms ic-muted">edit_note</span>
              <span class="li-text">
                <span class="over">Continue writing</span>
                <span class="li-title">{{ c.name }}</span>
                <span class="li-sub">{{ c.sub }}</span>
              </span>
              <span class="ms li-trail">chevron_right</span>
            </button>
          }
        </div>
        <button class="fab" slot="fixed" type="button" (click)="nav.go('/new-gdd')"><span class="ms">add</span>New GDD</button>
      }
    </ion-content>
  `,
})
export class HomePage implements AfterViewInit {
  protected store = inject(StoreService);
  protected nav = inject(NavService);
  private car = viewChild<ElementRef<HTMLDivElement>>('car');
  protected gdds = computed(() => this.store.data().gdds);
  protected idx = computed(() => Math.max(0, Math.min(this.store.homeIndex(), this.gdds().length - 1)));
  /** « (Art, Audio)» si eres Editor solo de algunos departamentos. */
  private mine(g: Gdd): string {
    const n = (g.share?.depts ?? []).map((id) => g.depts.find((d) => d.id === id)?.name).filter(Boolean);
    return n.length ? ' (' + n.join(', ') + ')' : '';
  }
  protected cards = computed(() => this.gdds().map((g) => ({ id: g.id, name: g.name, desc: g.share ? 'Shared by ' + g.share.name + ' · ' + g.share.role + this.mine(g) : g.desc, updated: this.store.gUpdated(g), st: this.store.gStat(g) })));
  protected cont = computed(() => {
    const g = this.gdds()[this.idx()];
    const L = g?.last;
    const dp = L ? this.store.dept(g, L.dp) : null;
    const b = dp?.blocks.find((x) => x.id === L!.b);
    if (!g || !dp || !b) return null;
    return { name: b.name, sub: dp.name + ' · ' + (L!.ts && L!.ts > 1e12 ? 'edited ' + this.store.when(L!.ts, '').toLowerCase() : L!.when.charAt(0).toLowerCase() + L!.when.slice(1)), url: '/gdd/' + g.id + '/dept/' + dp.id + '/block/' + b.id };
  });

  ngAfterViewInit(): void {
    const el = this.car()?.nativeElement;
    if (el) el.scrollLeft = this.idx() * CARD_STEP;
  }
  onScroll(el: HTMLElement): void {
    const i = Math.round(el.scrollLeft / CARD_STEP);
    if (i !== this.store.homeIndex()) this.store.homeIndex.set(i);
  }
}

@Component({
  selector: 'app-new-gdd',
  imports: [IonHeader, IonContent, TopBarComponent],
  template: `
    <ion-header><app-top-bar title="Create template" sub="New GDD" back="/home" /></ion-header>
    <ion-content>
      <form class="page with-nav" (submit)="$event.preventDefault(); create()" novalidate>
        <div class="field" [class.error]="err()">
          <div class="field-box">
            <label for="ng-name">Project name</label>
            <input id="ng-name" [value]="name()" (input)="name.set($any($event.target).value); err.set(false)" />
          </div>
          @if (err()) { <span class="field-error">Enter a project name.</span> }
        </div>
        <fieldset class="list" style="border:none;padding:0;margin:0">
          <legend class="section-title" style="padding-bottom:8px">How much detail does your project need?</legend>
          @for (o of opts; track o[0]) {
            <button class="li tall" type="button" role="radio" [attr.aria-checked]="tpl() === o[0]" (click)="pick(o[0])">
              <span class="radio" [class.on]="tpl() === o[0]"></span>
              <span class="li-text"><span class="li-title">{{ o[0] }}</span><span class="li-sub">{{ o[1] }}</span></span>
            </button>
          }
        </fieldset>
        <div>
          <h2 class="section-title">Departments in your GDD</h2>
          <p class="li-sub" style="padding:4px 4px 8px">{{ on().length }} of 10 selected · Turn off what your project doesn’t need.</p>
          <ul class="list card">
            @for (c of catalog; track c[0]; let i = $index) {
              <li>
                <button class="li" type="button" role="checkbox" [attr.aria-checked]="on().includes(i)" (click)="flip(i)">
                  <span class="check" [class.on]="on().includes(i)">@if (on().includes(i)) { <span class="ms">check</span> }</span>
                  <span class="li-text"><span class="li-title">{{ c[0] }}</span><span class="li-sub">{{ blocksText(c) }}</span></span>
                </button>
              </li>
            }
          </ul>
        </div>
        <button class="btn btn-filled m block" type="submit">Create GDD</button>
      </form>
    </ion-content>
  `,
})
export class NewGddPage {
  private store = inject(StoreService);
  private nav = inject(NavService);
  protected catalog = CATALOG;
  protected opts: [Template, string][] = [['Detailed', 'Every block of a complete GDD.'], ['Minimal', 'Only the essential blocks to get started.'], ['Blank', 'Start from scratch, without a template. Add your own departments and blocks.']];
  private d = this.store.takeDraft('newgdd', { name: '', tpl: 'Detailed' as Template, on: TEMPLATE_DEPTS.Detailed, err: false });
  protected name = signal(this.d.name);
  protected tpl = signal<Template>(this.d.tpl);
  protected on = signal<number[]>(this.d.on);
  protected err = signal(this.d.err);

  pick(t: Template): void { this.tpl.set(t); this.on.set(TEMPLATE_DEPTS[t]); }
  flip(i: number): void { this.on.update((o) => (o.includes(i) ? o.filter((x) => x !== i) : [...o, i])); }
  blocksText(c: (typeof CATALOG)[number]): string {
    const n = this.tpl() === 'Detailed' ? c[2].length : this.tpl() === 'Minimal' ? c[1] : 0;
    return n ? n + (n === 1 ? ' block' : ' blocks') : 'No blocks';
  }
  create(): void {
    const name = this.name().trim();
    if (!name) { this.err.set(true); return; }
    const g = this.store.createGdd(name, this.tpl(), this.on());
    this.nav.replace('/gdd/' + g.id);
  }
}
