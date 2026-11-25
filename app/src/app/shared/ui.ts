// Piezas de interfaz compartidas por varias pantallas.
import type { ElementRef } from '@angular/core';
import { Component, computed, effect, inject, input, model, output, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { AVATAR_ICON } from '../data/models';
import { StoreService, type StatusKind } from '../data/store.service';
import { TPipe } from '../i18n/i18n';

import { NavService } from './nav.service';

/** Logotipo: icono de la cruceta + «My GDD.» */
@Component({
  selector: 'app-brand',
  imports: [TPipe],
  template: `
    <span class="brand">
      @if (icon()) {
        <svg class="brand-icon" viewBox="0 0 48 48" aria-hidden="true">
          <rect width="48" height="48" rx="12" fill="#3F48CC" />
          <g stroke="#232BB4" stroke-width="1.5">
            <rect x="19" y="7" width="10" height="10" rx="2" fill="#FDF8F9" />
            <rect x="7" y="19" width="10" height="10" rx="2" fill="#FDF8F9" />
            <rect x="31" y="19" width="10" height="10" rx="2" fill="#FDF8F9" />
            <rect x="19" y="31" width="10" height="10" rx="2" fill="#FDF8F9" />
          </g>
          <rect x="19" y="19" width="10" height="10" rx="2" fill="#FF8E6E" stroke="#E8603C" stroke-width="1.5" />
        </svg>
      }
      <span>My <b>GDD</b><span class="dot"></span></span>
    </span>
  `,
})
export class BrandComponent {
  readonly icon = input(true);
}

/** Estado de un bloque o proyecto: símbolo (y texto) sin depender solo del color. */
@Component({
  selector: 'app-status',
  template: `
    @switch (k()) {
      @case ('old') {
        <span class="lbl av sym" aria-hidden="true">!</span>
      }
      @case ('ok') {
        <span class="ms s16 ic-ok" aria-hidden="true">check_circle</span>
      }
      @default {
        <span class="st-empty" aria-hidden="true"></span>
      }
    }
    @if (text()) {
      <span [class.sr-only]="hideText()">{{ text() }}</span>
    }
  `,
  host: { style: 'display:inline-flex;align-items:center;gap:6px' },
})
export class StatusComponent {
  readonly kind = input.required<string>();
  protected k = computed(() => statusKind(this.kind()));
  readonly text = input('');
  readonly hideText = input(false);
}
export const statusKind = (s: string): StatusKind =>
  s === 'Out of date' || s === 'old' ? 'old' : s === 'Up to date' || s === 'ok' ? 'ok' : 'empty';

/** Top app bar: atrás, título (o logo en Home), subtítulo, buscar y avatar. */
@Component({
  selector: 'app-top-bar',
  imports: [TPipe, BrandComponent],
  template: `
    <div class="top-bar">
      @if (searching()) {
        <button class="icon-btn" type="button" [attr.aria-label]="'Close search' | t" (click)="closeSearch()">
          <span class="ms">arrow_back</span>
        </button>
        <input
          #q
          class="search"
          type="search"
          [placeholder]="searchLabel()"
          [attr.aria-label]="searchLabel()"
          [value]="query()"
          (input)="query.set($any($event.target).value)"
        />
        @if (query()) {
          <button
            class="icon-btn"
            type="button"
            [attr.aria-label]="'Clear search' | t"
            (click)="query.set(''); q.focus()"
          >
            <span class="ms">close</span>
          </button>
        }
      } @else {
        @if (back() !== null) {
          <button class="icon-btn" type="button" [attr.aria-label]="'Back' | t" (click)="goBack()">
            <span class="ms">arrow_back</span>
          </button>
        }
        <div class="titles" [class.with-back]="back() !== null">
          @if (brand()) {
            <h1><app-brand /></h1>
          } @else {
            <h1>{{ title() }}</h1>
            @if (sub()) {
              <span class="sub">{{ sub() }}</span>
            }
          }
        </div>
        @if (searchLabel()) {
          <button class="icon-btn" type="button" [attr.aria-label]="searchLabel()" (click)="openSearch()">
            <span class="ms">search</span>
          </button>
        }
        @if (profile()) {
          <button class="icon-btn avatar" type="button" [attr.aria-label]="'Profile' | t" (click)="nav.go('/profile')">
            <span class="ms">{{ avatar() }}</span>
          </button>
        }
      }
    </div>
  `,
})
export class TopBarComponent {
  protected nav = inject(NavService);
  private store = inject(StoreService);
  readonly title = input('');
  readonly sub = input('');
  /** URL a la que vuelve «atrás» si no hay historial; null = sin botón atrás. */
  readonly back = input<string | null>(null);
  readonly brand = input(false);
  readonly profile = input(true);
  readonly searchLabel = input('');
  readonly query = model('');
  readonly searching = model(false);
  private qEl = viewChild<ElementRef<HTMLInputElement>>('q');
  protected avatar = computed(() => AVATAR_ICON[this.store.data().user.av]);

  constructor() {
    effect(() => {
      if (this.searching()) setTimeout(() => this.qEl()?.nativeElement.focus());
    });
  }
  goBack(): void {
    this.nav.back(this.back() ?? '/home');
  }
  openSearch(): void {
    this.query.set('');
    this.searching.set(true);
  }
  closeSearch(): void {
    this.query.set('');
    this.searching.set(false);
  }
}

/** Barra de navegación inferior: Home, Notes (con aviso de no leídas) y Help. */
@Component({
  selector: 'app-nav-bar',
  imports: [TPipe],
  template: `
    @if (visible()) {
      <nav class="nav-bar" [attr.aria-label]="'Main' | t">
        <button
          type="button"
          [class.on]="tab() === 'home'"
          [attr.aria-current]="tab() === 'home' ? 'page' : null"
          (click)="go('home')"
        >
          <span class="pill"><span class="ms">home</span></span
          >{{ 'Home' | t }}
        </button>
        <button
          type="button"
          [class.on]="tab() === 'notes'"
          [attr.aria-current]="tab() === 'notes' ? 'page' : null"
          (click)="go('notes')"
        >
          <span class="pill"
            ><span class="ms">sticky_note_2</span>
            @if (store.unread()) {
              <span class="badge" [attr.aria-label]="store.unread() + ' new'"
                >{{ store.unread() }}<span class="ring"></span
              ></span>
            }</span
          >{{ 'Notes' | t }}
        </button>
        <button
          type="button"
          [class.on]="tab() === 'help'"
          [attr.aria-current]="tab() === 'help' ? 'page' : null"
          (click)="go('help')"
        >
          <span class="pill"><span class="ms">help</span></span
          >{{ 'Help' | t }}
        </button>
      </nav>
    }
  `,
})
export class NavBarComponent {
  protected store = inject(StoreService);
  private nav = inject(NavService);
  private url = signal(location.pathname);
  protected visible = computed(() => {
    const u = this.url();
    return !/^\/(login|signup|forgot|scenes)/.test(u) && !/\/block\//.test(u) && u !== '/';
  });
  protected tab = computed(() => {
    const u = this.url();
    if (u.startsWith('/notes')) return 'notes';
    if (u.startsWith('/help')) return 'help';
    if (u.startsWith('/home') || u.startsWith('/new-gdd') || u.startsWith('/gdd')) return 'home';
    return '';
  });

  constructor() {
    inject(Router)
      .events.pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e) => this.url.set((e as NavigationEnd).urlAfterRedirects.split('?')[0]));
  }
  go(t: 'home' | 'notes' | 'help'): void {
    if (this.tab() === t && this.url() === '/' + t) return;
    if (t === 'notes') this.store.markNotesRead();
    if (t === 'home') this.nav.root('/home');
    else this.nav.go('/' + t);
  }
}

/** Interruptor accesible (role="switch"). */
@Component({
  selector: 'app-switch',
  template: `<button
    type="button"
    class="switch"
    role="switch"
    [attr.aria-checked]="on()"
    [attr.aria-label]="label()"
    (click)="on.set(!on()); changed.emit(on())"
  >
    <span></span>
  </button>`,
})
export class SwitchComponent {
  readonly on = model(false);
  readonly label = input('');
  readonly changed = output<boolean>();
}

/** Button group (una opción elegida). */
@Component({
  selector: 'app-seg',
  imports: [TPipe],
  template: `
    <div class="seg" role="radiogroup" [attr.aria-label]="label()">
      @for (o of options(); track o) {
        <button
          type="button"
          role="radio"
          [class.on]="value() === o"
          [attr.aria-checked]="value() === o"
          (click)="value.set(o)"
        >
          @if (value() === o) {
            <span class="ms s18">check</span>
          }
          {{ o | t }}
        </button>
      }
    </div>
  `,
})
export class SegComponent {
  readonly options = input.required<string[]>();
  readonly value = model('');
  readonly label = input('');
}
