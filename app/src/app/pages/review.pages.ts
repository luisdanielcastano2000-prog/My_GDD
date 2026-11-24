// Review (bloques afectados por un cambio) y Out of date (bloques que hay que revisar).
import { Component, computed, inject, input } from '@angular/core';
import { IonContent, IonHeader } from '@ionic/angular';

import { StoreService } from '../data/store.service';
import { t, TPipe } from '../i18n/i18n';
import { NavService } from '../shared/nav.service';
import { TopBarComponent } from '../shared/ui';

@Component({
  selector: 'app-review',
  imports: [TPipe, IonHeader, IonContent, TopBarComponent],
  template: `
    <ion-header class="cards"><app-top-bar [title]="'Review' | t" [sub]="g()?.name ?? ''" back="/notes" /></ion-header>
    <ion-content class="page-cards">
      <div class="page with-nav">
        <div>
          <p class="crumb" style="padding:0">{{ 'Blocks affected by the latest change' | t }}</p>
          <h2 class="t-title-large">{{ note()?.title }}</h2>
        </div>
        @if (allDone()) {
          <div class="banner-warn" style="background:var(--gdd-exito-suave);box-shadow:inset 0 0 0 1px var(--gdd-exito)">
            <span class="ms ic-ok">check_circle</span>
            <span class="li-text"><span class="li-title">{{ 'All up to date' | t }}</span><span class="li-sub">{{ 'There’s nothing left to review.' | t }}</span></span>
          </div>
        }
        <ul class="list card">
          @for (it of items(); track it.id) {
            <li>
              @if (it.done) {
                <div class="rv-item done">
                  <span class="ms ic-ok">check_circle</span>
                  <span class="li-text"><span class="li-title">{{ it.name }}</span><span class="li-sub">{{ it.path }} · {{ it.st }}</span></span>
                </div>
              } @else {
                <button class="rv-item" type="button" [attr.aria-label]="'Review {name}, {status}' | t: { name: it.name, status: it.st }" (click)="nav.go(it.url)">
                  @if (it.needs) { <span class="lbl av sym" aria-hidden="true">!</span> } @else { <span class="ms ic-muted">radio_button_unchecked</span> }
                  <span class="li-text"><span class="li-title">{{ it.name }}</span><span class="li-sub">{{ it.path }} · {{ it.st }}</span></span>
                  <span class="t-label-large" style="color:var(--gdd-primary)">{{ 'Review block' | t }}</span>
                  <span class="ms li-trail">chevron_right</span>
                </button>
              }
            </li>
          }
        </ul>
        <button class="btn btn-filled m block" type="button" (click)="store.notify(note())">{{ 'Notify team' | t }}</button>
        <button class="btn btn-text" type="button" style="align-self:center" (click)="nav.go('/gdd/' + gid())">{{ 'See full project' | t }}</button>
      </div>
    </ion-content>
  `,
})
export class ReviewPage {
  protected store = inject(StoreService);
  protected nav = inject(NavService);
  readonly gid = input.required<string>();
  readonly nid = input.required<string>();
  protected g = computed(() => this.store.gdd(this.gid()));
  protected note = computed(() => this.store.data().notes.find((n) => n.id === this.nid()) ?? null);
  protected items = computed(() => {
    const n = this.note();
    return (n?.aff ?? [])
      .map((bid) => {
        const w = this.store.where(bid);
        if (!w) return null;
        const needs = w.b.secs.some((s) => s.rev);
        // Revisado: lo dice el propio bloque (cualquiera del equipo puede haberlo revisado) o la nota
        const done = !!n?.rvd?.includes(bid) || (!w.b.pend && !needs && w.b.status !== 'Out of date');
        return { id: bid, name: w.b.name, path: w.dp.name, done, needs, st: t(done ? 'Reviewed' : needs ? 'Needs review' : 'Not reviewed yet'), url: '/gdd/' + w.g.id + '/dept/' + w.dp.id + '/block/' + bid };
      })
      .filter((x) => !!x);
  });
  protected allDone = computed(() => this.items().length > 0 && this.items().every((x) => x.done));
}

@Component({
  selector: 'app-outdated',
  imports: [TPipe, IonHeader, IonContent, TopBarComponent],
  template: `
    <ion-header class="cards"><app-top-bar [title]="'Out of date' | t" [sub]="g()?.name ?? ''" [back]="'/gdd/' + gid()" /></ion-header>
    <ion-content class="page-cards">
      <div class="page with-nav" style="gap:8px">
        <div class="chips">
          <button class="chip on filter-chip" type="button" [attr.aria-label]="'Remove filter: Out of date, {n}' | t: { n: count() }" (click)="clear()"><span class="ms">check</span>{{ 'Out of date · {p0}' | t: { p0: count() } }}<span class="ms">close</span></button>
          @if (fdp(); as d) { <span class="chip on"><span class="ms">check</span>{{ d.name }}</span> }
        </div>
        @if (count()) {
          <p class="intro t-body-medium">{{ 'Only the blocks that need review. Open one to update it.' | t }}</p>
          @for (gp of groups(); track gp.name) {
            <h2 class="group-title">{{ gp.name }}</h2>
            <ul class="list card">
              @for (it of gp.items; track it.id) {
                <li>
                  <button class="od-item" type="button" [attr.aria-label]="'Review {name}, {status}' | t: { name: it.name, status: it.why }" (click)="nav.go(it.url)">
                    <span class="lbl av sym" aria-hidden="true">!</span>
                    <span class="li-text"><span class="li-title">{{ it.name }}</span><span class="li-sub">{{ it.why }}</span></span>
                    <span class="t-label-large" style="color:var(--gdd-primary)">{{ 'Review' | t }}</span>
                    <span class="ms li-trail">chevron_right</span>
                  </button>
                </li>
              }
            </ul>
          }
        } @else {
          <div class="empty">
            <span class="ms ic-ok">check_circle</span>
            <h2 class="t-headline-small">{{ 'Everything is up to date' | t }}</h2>
            <p>{{ 'No block needs review right now.' | t }}</p>
            <button class="btn btn-text" type="button" (click)="clear()">{{ 'Show all blocks' | t }}</button>
          </div>
        }
      </div>
    </ion-content>
  `,
})
export class OutdatedPage {
  protected store = inject(StoreService);
  protected nav = inject(NavService);
  readonly gid = input.required<string>();
  readonly dp = input<string>(''); // ?dp= filtra por departamento
  protected g = computed(() => this.store.gdd(this.gid()));
  protected fdp = computed(() => (this.dp() ? this.store.dept(this.g(), this.dp()) : null));
  protected groups = computed(() => {
    const g = this.g();
    if (!g) return [];
    const f = this.fdp();
    return g.depts
      .filter((x) => !f || x.id === f.id)
      .map((x) => ({
        name: x.name,
        items: x.blocks
          .filter((y) => y.status === 'Out of date')
          .map((y) => {
            const r = y.secs.filter((s) => s.rev);
            return { id: y.id, name: y.name, why: r.length ? t('Needs review: {list}', { list: r.map((s) => s.t || t('Untitled section')).join(', ') }) : t('Not reviewed after the latest change'), url: '/gdd/' + g.id + '/dept/' + x.id + '/block/' + y.id };
          }),
      }))
      .filter((x) => x.items.length);
  });
  protected count = computed(() => this.groups().reduce((a, x) => a + x.items.length, 0));
  clear(): void {
    const f = this.fdp();
    this.nav.replace(f ? '/gdd/' + this.gid() + '/dept/' + f.id : '/gdd/' + this.gid());
  }
}
