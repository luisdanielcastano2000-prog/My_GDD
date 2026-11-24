// Elegir a qué proyectos entra una persona del equipo y, en cada uno, su rol y sus departamentos.
// Lo usan las hojas «Invite a member» y «Manage …».
import { Component, input, output } from '@angular/core';

import type { Gdd, Grant } from '../data/models';
import { t, TPipe } from '../i18n/i18n';

import { SegComponent } from './ui';

@Component({
  selector: 'app-grants',
  imports: [TPipe, SegComponent],
  template: `
    <span class="t-label-large">{{ 'Projects' | t }}</span>
    @if (!gdds().length) {
      <p class="li-sub">{{ 'Create a GDD first. People in your team only see the projects you choose here.' | t }}</p>
    }
    <ul class="list card grants">
      @for (g of gdds(); track g.id) {
        @let gr = find(g.id);
        <li>
          <button class="li" type="button" role="checkbox" [attr.aria-checked]="!!gr" (click)="toggle(g.id)">
            <span class="check" [class.on]="!!gr">@if (gr) { <span class="ms">check</span> }</span>
            <span class="li-text"><span class="li-title">{{ g.name }}</span><span class="li-sub">{{ sub(g, gr) }}</span></span>
          </button>
          @if (gr) {
            <div class="grant-opts">
              <app-seg [label]="'Role in ' + g.name" [options]="['Editor', 'Viewer']" [value]="gr.role" (valueChange)="setRole(g.id, $any($event))" />
              @if (g.depts.length) {
                <span class="li-sub">{{ (gr.role === 'Editor' ? 'Departments they can edit · None selected = all' : 'Their departments · They get the notes sent to them') | t }}</span>
                <div class="chips">
                  @for (d of g.depts; track d.id) {
                    <button class="chip" type="button" [class.on]="gr.depts.includes(d.id)" [attr.aria-pressed]="gr.depts.includes(d.id)" (click)="flipDept(g.id, d.id)">
                      @if (gr.depts.includes(d.id)) { <span class="ms">check</span> }{{ d.name }}
                    </button>
                  }
                </div>
              }
            </div>
          }
        </li>
      }
    </ul>
  `,
})
export class GrantsComponent {
  /** Tus GDDs (los que puedes compartir). */
  readonly gdds = input.required<Gdd[]>();
  readonly grants = input.required<Grant[]>();
  readonly grantsChange = output<Grant[]>();

  find(gid: string): Grant | undefined {
    return this.grants().find((x) => x.g === gid);
  }
  sub(g: Gdd, gr: Grant | undefined): string {
    if (!gr) return t('No access');
    const names = gr.depts.map((id) => g.depts.find((d) => d.id === id)?.name).filter(Boolean);
    if (gr.role === 'Viewer') return t('Can read and send notes') + (names.length ? ' · ' + names.join(', ') : '');
    return names.length ? t('Can edit {list} · Reads the rest', { list: names.join(', ') }) : t('Can edit everything');
  }
  toggle(gid: string): void {
    const has = !!this.find(gid);
    this.grantsChange.emit(has ? this.grants().filter((x) => x.g !== gid) : [...this.grants(), { g: gid, role: 'Editor', depts: [] }]);
  }
  setRole(gid: string, role: 'Editor' | 'Viewer'): void {
    this.grantsChange.emit(this.grants().map((x) => (x.g === gid ? { ...x, role } : x)));
  }
  flipDept(gid: string, did: string): void {
    this.grantsChange.emit(this.grants().map((x) => (x.g === gid ? { ...x, depts: x.depts.includes(did) ? x.depts.filter((d) => d !== did) : [...x.depts, did] } : x)));
  }
}

/** Texto corto del acceso de una persona: «Editor · 2 of 3 projects», «Viewer · All projects». */
export function accessText(role: string, grants: Grant[] | undefined, total: number): string {
  const r = t(role);
  if (!grants) return r + ' · ' + t('All projects');
  const n = grants.length;
  return r + ' · ' + (n === total && total ? t('All projects') : t(total === 1 ? '{n} of {total} project' : '{n} of {total} projects', { n, total }));
}
