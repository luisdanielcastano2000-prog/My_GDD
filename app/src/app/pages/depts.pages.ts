// Departamentos de un GDD y bloques de un departamento.
import { Component, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { IonContent, IonHeader } from '@ionic/angular';

import { StoreService } from '../data/store.service';
import { NavService } from '../shared/nav.service';
import { ReorderDirective } from '../shared/reorder.directive';
import { TilesDirective } from '../shared/tiles.directive';
import { StatusComponent, TopBarComponent } from '../shared/ui';

/** Cuando aparece algo nuevo al final de la lista (departamento o bloque), baja hasta verlo. */
function scrollToNew(content: () => IonContent | undefined, popped: () => string | null, isMine: (id: string) => boolean): void {
  effect(() => {
    const id = popped();
    if (id && isMine(id)) setTimeout(() => void content()?.scrollToBottom(300), 30);
  });
}

@Component({
  selector: 'app-depts',
  imports: [IonHeader, IonContent, TopBarComponent, StatusComponent, TilesDirective, ReorderDirective],
  template: `
    <ion-header class="cards">
      <app-top-bar title="Departments" [sub]="g()?.name ?? ''" back="/home" searchLabel="Search departments" [(query)]="q" [(searching)]="searching" />
    </ion-header>
    <ion-content class="page-cards">
      @if (g(); as gd) {
        <div class="page with-fab" style="gap:8px">
          @if (gd.depts.length) {
            @if (!searching()) { <p class="intro t-body-medium">{{ intro() }}</p> }
            <ul class="dept-list" appReorder [reorderOn]="edit() && !q()" (reordered)="store.reorder('dept', gd.id, null, $event.from, $event.to)">
              @for (x of list(); track x.id) {
                <li class="dept-card card" [class.pop-in]="store.popped() === x.id" [appTiles]="store.tile(x.id)" [attr.data-flip]="x.id" [attr.data-reorder]="x.id">
                  <button class="open" type="button" [attr.aria-label]="'Open ' + x.name + ', ' + x.st.t" (click)="nav.go('/gdd/' + gd.id + '/dept/' + x.id)"></button>
                  <span class="num-band" [style.background]="x.band">{{ x.num }}</span>
                  <span class="content">
                    <span class="li-title">{{ x.name }}</span>
                    <span class="meta">
                      @if (x.st.k === 'old') {
                        {{ x.st.nb }}
                        <button class="chip-warn" type="button" [attr.aria-label]="'Show the ' + x.st.old + ' out of date in ' + x.name" (click)="nav.go('/gdd/' + gd.id + '/outdated?dp=' + x.id)"><span class="lbl av sym" aria-hidden="true">!</span>{{ x.st.old }} out of date<span class="ms">chevron_right</span></button>
                      } @else {
                        <app-status [kind]="x.st.k" [text]="x.st.t" />
                      }
                    </span>
                  </span>
                  @if (edit()) { <button class="icon-btn more" type="button" [attr.aria-label]="'More options for ' + x.name" (click)="store.sheet.set({ k: 'act', what: 'dept', id: x.id, g: gd.id })"><span class="ms">more_vert</span></button> }
                </li>
              }
            </ul>
            @if (q() && !list().length) { <p class="no-results">No results for “{{ q() }}”.</p> }
          } @else {
            <div class="empty">
              <span class="ms">layers</span>
              <h2 class="t-headline-small">No departments yet</h2>
              @if (edit()) {
                <p>Add the departments your team needs, in production order.</p>
                <button class="btn btn-text" type="button" (click)="store.useTemplate(gd.id)">Use a template instead</button>
              } @else { <p>{{ gd.share?.name }} hasn’t added departments yet.</p> }
            </div>
          }
        </div>
        @if (!searching() && edit()) {
          <button class="fab" slot="fixed" type="button" (click)="store.quickDept(gd.id)"><span class="ms">add</span>Department</button>
        }
      }
    </ion-content>
  `,
})
export class DeptsPage {
  protected store = inject(StoreService);
  private content = viewChild(IonContent);
  constructor() {
    scrollToNew(this.content, this.store.popped, (id) => !!this.g()?.depts.some((x) => x.id === id));
  }
  protected nav = inject(NavService);
  readonly gid = input.required<string>(); // de la ruta /gdd/:gid
  protected q = signal(this.store.takeDraft('depts', { q: '' }).q);
  protected searching = signal(!!this.q());
  protected g = computed(() => this.store.gdd(this.gid()));
  protected edit = computed(() => this.store.canManageDepts(this.gid())); // crear, renombrar, mover y borrar departamentos
  protected intro = computed(() => {
    const g = this.g();
    if (!g?.share) return 'Your GDD follows the production pipeline. Open a department to see its blocks.';
    if (g.share.role === 'Viewer') return 'Shared by ' + g.share.name + '. You can read it and send notes.';
    const mine = this.store.myDepts(g.id).map((id) => g.depts.find((d) => d.id === id)?.name).filter(Boolean);
    return 'Shared by ' + g.share.name + '. ' + (mine.length ? 'You can edit: ' + mine.join(', ') + '.' : 'You can edit every department.');
  });
  protected list = computed(() => {
    const g = this.g();
    if (!g) return [];
    const q = this.q().trim().toLowerCase();
    return g.depts
      .map((x, i) => ({ id: x.id, name: x.name, num: String(i + 1).padStart(2, '0'), band: this.store.deptColor(g, x), st: this.store.dStat(x) }))
      .filter((x) => !q || x.name.toLowerCase().includes(q));
  });
}

@Component({
  selector: 'app-dept',
  imports: [IonHeader, IonContent, TopBarComponent, StatusComponent, TilesDirective, ReorderDirective],
  template: `
    <ion-header class="cards">
      <app-top-bar [title]="dp()?.name ?? ''" [sub]="g()?.name ?? ''" [back]="'/gdd/' + gid()" searchLabel="Search blocks" [(query)]="q" [(searching)]="searching" />
    </ion-header>
    <ion-content class="page-cards">
      @if (dp(); as d) {
        <div class="page" style="gap:12px; padding-bottom: calc(80px * var(--gdd-ts) + 168px)">
          @if (!searching()) { <p class="crumb" style="padding:0">Department {{ pos() }} of {{ g()!.depts.length }} in the production pipeline</p> }
          @if (d.blocks.length) {
            <div class="blocks" appReorder [reorderOn]="edit() && !q()" (reordered)="store.reorder('block', gid(), d.id, $event.from, $event.to)">
              @for (b of blocks(); track b.id) {
                <div class="block-tile card" [class.pop-in]="store.popped() === b.id" [appTiles]="store.tile(b.id)" [attr.data-flip]="b.id" [attr.data-reorder]="b.id">
                  <button class="open" type="button" [attr.aria-label]="b.name + ', ' + b.status" (click)="nav.go('/gdd/' + gid() + '/dept/' + d.id + '/block/' + b.id)"></button>
                  <span class="band" [style.background]="band()"></span>
                  <span class="content">
                    <span class="num">{{ b.num }}</span>
                    <span class="name">{{ b.name }}</span>
                  </span>
                  <span class="st"><app-status [kind]="b.status" [text]="b.status" [hideText]="true" /></span>
                  @if (edit()) { <button class="icon-btn more" type="button" [attr.aria-label]="'More options for ' + b.name" (click)="store.sheet.set({ k: 'act', what: 'block', id: b.id, g: gid(), dp: d.id })"><span class="ms s20">more_vert</span></button> }
                </div>
              }
              @if (!searching() && edit()) {
                <div class="add-cell"><button class="btn btn-tonal m" type="button" (click)="store.quickBlock(gid(), d.id)"><span class="ms">add</span>Block</button></div>
              }
            </div>
            @if (q() && !blocks().length) { <p class="no-results">No results for “{{ q() }}”.</p> }
            <p class="crumb" style="padding:0">Tap a block to open it.</p>
          } @else {
            <div class="empty dashed">
              <span class="ms s40 ic-muted">description</span>
              <h2 class="t-title-large">No blocks yet</h2>
              @if (edit()) {
                <p>Add the first block of this department. You can add as many as you need.</p>
                <button class="btn btn-tonal m" type="button" (click)="store.quickBlock(gid(), d.id)"><span class="ms">add</span>Block</button>
                <button class="btn btn-text" type="button" (click)="store.suggest(gid(), d.id)">Use suggested blocks</button>
              } @else { <p>This department has no blocks yet.</p> }
            </div>
          }
        </div>
        <div class="help-bar" slot="fixed">
          <button class="btn btn-text" type="button" (click)="nav.go('/help/guide')"><span class="ms">help</span>Not sure what to write? Get help</button>
        </div>
        @if (!searching()) {
          <button class="fab" slot="fixed" type="button" style="bottom: calc(80px * var(--gdd-ts) + 72px)" (click)="noteChange()"><span class="ms">campaign</span>Note a change</button>
        }
      }
    </ion-content>
  `,
})
export class DeptPage {
  protected store = inject(StoreService);
  private content = viewChild(IonContent);
  constructor() {
    scrollToNew(this.content, this.store.popped, (id) => !!this.dp()?.blocks.some((x) => x.id === id));
  }
  protected nav = inject(NavService);
  readonly gid = input.required<string>();
  readonly dpid = input.required<string>();
  protected q = signal('');
  protected searching = signal(false);
  protected g = computed(() => this.store.gdd(this.gid()));
  protected dp = computed(() => this.store.dept(this.g(), this.dpid()));
  protected edit = computed(() => this.store.canEditDept(this.gid(), this.dpid())); // escribir en los bloques de este departamento
  protected pos = computed(() => (this.g()?.depts.indexOf(this.dp()!) ?? 0) + 1);
  protected band = computed(() => (this.g() && this.dp() ? this.store.deptColor(this.g()!, this.dp()!) : ''));
  protected blocks = computed(() => {
    const d = this.dp();
    if (!d) return [];
    const q = this.q().trim().toLowerCase();
    return d.blocks.map((b, i) => ({ ...b, num: String(i + 1).padStart(2, '0') })).filter((b) => !q || b.name.toLowerCase().includes(q));
  });

  noteChange(): void {
    this.store.setDraft('newnote', { g: this.gid(), dp: this.dpid(), b: null });
    this.nav.go('/notes/new');
  }
}
