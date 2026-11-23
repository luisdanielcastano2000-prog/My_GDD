// Acceso: Log in, Sign up, Reset password (formulario y «Check your email»).
import { Component, inject, input, signal, type WritableSignal } from '@angular/core';
import { IonContent, IonHeader } from '@ionic/angular';

import { StoreService } from '../data/store.service';
import { NavService } from '../shared/nav.service';
import { BrandComponent, TopBarComponent } from '../shared/ui';

/** Botón con carga: texto → spinner (mín. 400 ms) → check en verde → sigue. */
export function withLoading(store: StoreService, phase: WritableSignal<'' | 'load' | 'ok'>, done: () => void): void {
  if (phase()) return;
  const k = store.settings().slowMotion ? 4 : 1;
  if (store.settings().reduceMotion) { done(); return; }
  phase.set('load');
  setTimeout(() => { phase.set('ok'); setTimeout(() => { phase.set(''); done(); }, 650 * k); }, 400 * k);
}

const validEmail = (e: string): boolean => e.trim().indexOf('@') > 0;

@Component({
  selector: 'app-login',
  imports: [IonContent, BrandComponent],
  template: `
    <ion-content>
      <form class="auth" (submit)="$event.preventDefault(); submit()" novalidate>
        <div class="logo">
          <app-brand />
          <p class="tagline">Your GDD, structured and up to date.</p>
        </div>
        <h2><span class="ms ic-muted">account_circle</span>Log in</h2>
        <div class="field" [class.error]="errEmail()">
          <div class="field-box">
            <label for="lg-email">Email</label>
            <input id="lg-email" type="email" autocomplete="email" [value]="email()" (input)="email.set($any($event.target).value); clear()" />
          </div>
          @if (errEmail()) { <span class="field-error">Enter your email.</span> }
        </div>
        <div class="field" [class.error]="errPw()">
          <div class="field-box">
            <label for="lg-pw">Password</label>
            <input id="lg-pw" [type]="show() ? 'text' : 'password'" autocomplete="current-password" [value]="pw()" (input)="pw.set($any($event.target).value); clear()" />
            <button class="icon-btn trail" type="button" [attr.aria-label]="show() ? 'Hide password' : 'Show password'" (click)="show.set(!show())"><span class="ms">{{ show() ? 'visibility_off' : 'visibility' }}</span></button>
          </div>
          @if (errPw()) { <span class="field-error">Enter your password.</span> }
        </div>
        @if (bad()) {
          <p class="bad" role="alert">The email or password is incorrect. Try again or reset your password.</p>
        }
        <button class="btn btn-text" type="button" style="align-self:flex-start;margin-left:-12px" (click)="forgot()">Forgot password?</button>
        <button class="btn btn-filled m block" type="submit" [class.ok]="phase() === 'ok'" [attr.aria-busy]="!!phase()">
          @switch (phase()) {
            @case ('load') { <span class="spin"></span>Logging in }
            @case ('ok') { <span class="ms">check</span>Logged in }
            @default { Log in }
          }
        </button>
        <p class="alt">Don’t have an account? <button class="btn btn-text" type="button" (click)="nav.go('/signup')">Sign up</button></p>
      </form>
    </ion-content>
  `,
})
export class LoginPage {
  private store = inject(StoreService);
  protected nav = inject(NavService);
  private d = this.store.takeDraft('login', { email: '', pw: '', bad: false });
  protected email = signal(this.d.email);
  protected pw = signal(this.d.pw);
  protected show = signal(false);
  protected errEmail = signal(false);
  protected errPw = signal(false);
  protected bad = signal(this.d.bad);
  protected phase = signal<'' | 'load' | 'ok'>('');

  clear(): void { this.errEmail.set(false); this.errPw.set(false); this.bad.set(false); }
  submit(): void {
    const em = this.email().trim();
    this.errEmail.set(!em);
    this.errPw.set(!this.pw());
    this.bad.set(!!em && !!this.pw() && !validEmail(em));
    if (this.errEmail() || this.errPw() || this.bad()) return;
    withLoading(this.store, this.phase, () => this.nav.root('/home'));
  }
  forgot(): void {
    this.store.setDraft('forgot', { email: this.email() });
    this.nav.go('/forgot');
  }
}

@Component({
  selector: 'app-signup',
  imports: [IonContent, BrandComponent],
  template: `
    <ion-content>
      <form class="auth" (submit)="$event.preventDefault(); submit()" novalidate>
        <div class="logo">
          <app-brand />
          <p class="tagline">Your GDD, structured and up to date.</p>
        </div>
        <div>
          <h2>Sign up</h2>
          <p class="li-sub">Create your account to start your GDD.</p>
        </div>
        <div class="field" [class.error]="errUser()">
          <div class="field-box">
            <label for="su-user">User name</label>
            <input id="su-user" autocomplete="username" [value]="user()" (input)="user.set($any($event.target).value); errUser.set(false)" />
          </div>
          @if (errUser()) { <span class="field-error">Enter a user name.</span> }
        </div>
        <div class="field" [class.error]="!!errEmail()">
          <div class="field-box">
            <label for="su-email">Email</label>
            <input id="su-email" type="email" autocomplete="email" [value]="email()" (input)="email.set($any($event.target).value); errEmail.set('')" />
          </div>
          @if (errEmail()) { <span class="field-error">{{ errEmail() }}</span> }
          @if (errEmail() === taken) {
            <button class="btn btn-text" type="button" style="align-self:flex-start" (click)="loginWith()">Log in with this email</button>
          }
        </div>
        <div class="field" [class.error]="errPw()">
          <div class="field-box">
            <label for="su-pw">Password</label>
            <input id="su-pw" [type]="show() ? 'text' : 'password'" autocomplete="new-password" [value]="pw()" (input)="pw.set($any($event.target).value); errPw.set(false)" />
            <button class="icon-btn trail" type="button" [attr.aria-label]="show() ? 'Hide password' : 'Show password'" (click)="show.set(!show())"><span class="ms">{{ show() ? 'visibility_off' : 'visibility' }}</span></button>
          </div>
          @if (errPw()) { <span class="field-error">The password needs at least 8 characters.</span> } @else { <span class="field-help">At least 8 characters.</span> }
        </div>
        <button class="btn btn-filled m block" type="submit" [class.ok]="phase() === 'ok'" [attr.aria-busy]="!!phase()">
          @switch (phase()) {
            @case ('load') { <span class="spin"></span>Creating your account }
            @case ('ok') { <span class="ms">check</span>Account created }
            @default { Sign up }
          }
        </button>
        <p class="alt">Already have an account? <button class="btn btn-text" type="button" (click)="nav.root('/login')">Log in</button></p>
      </form>
    </ion-content>
  `,
})
export class SignupPage {
  private store = inject(StoreService);
  protected nav = inject(NavService);
  protected readonly taken = 'This email already has an account.';
  private d = this.store.takeDraft('signup', { user: '', email: '', pw: '', ee: '' });
  protected user = signal(this.d.user);
  protected email = signal(this.d.email);
  protected pw = signal(this.d.pw);
  protected show = signal(false);
  protected errUser = signal(false);
  protected errEmail = signal(this.d.ee);
  protected errPw = signal(false);
  protected phase = signal<'' | 'load' | 'ok'>('');

  submit(): void {
    const u = this.user().trim();
    const em = this.email().trim();
    this.errUser.set(!u);
    this.errEmail.set(!validEmail(em) ? 'Enter an email address, for example name@example.com.' : em === this.store.data().user.email ? this.taken : '');
    this.errPw.set(this.pw().length < 8);
    if (this.errUser() || this.errEmail() || this.errPw()) return;
    withLoading(this.store, this.phase, () => { this.store.signup(u, em); this.nav.root('/home'); });
  }
  loginWith(): void {
    this.store.setDraft('login', { email: this.email() });
    this.nav.root('/login');
  }
}

@Component({
  selector: 'app-forgot',
  imports: [IonHeader, IonContent, TopBarComponent],
  template: `
    <ion-header><app-top-bar title="Reset password" back="/login" [profile]="false" /></ion-header>
    <ion-content>
      <form class="page" (submit)="$event.preventDefault(); send()" novalidate>
        <p class="intro">Enter the email of your account. We’ll send you a link to create a new password.</p>
        <div class="field" [class.error]="err()">
          <div class="field-box">
            <label for="fg-email">Email</label>
            <input id="fg-email" type="email" autocomplete="email" [value]="email()" (input)="email.set($any($event.target).value); err.set(false)" />
          </div>
          @if (err()) { <span class="field-error">Enter the email of your account, for example name&#64;example.com.</span> }
        </div>
        <button class="btn btn-filled m block" type="submit" [class.ok]="phase() === 'ok'" [attr.aria-busy]="!!phase()">
          @switch (phase()) {
            @case ('load') { <span class="spin"></span>Sending the link }
            @case ('ok') { <span class="ms">check</span>Link sent }
            @default { Send link }
          }
        </button>
      </form>
    </ion-content>
  `,
})
export class ForgotPage {
  private store = inject(StoreService);
  private nav = inject(NavService);
  protected email = signal(this.store.takeDraft('forgot', { email: '' }).email);
  protected err = signal(false);
  protected phase = signal<'' | 'load' | 'ok'>('');

  send(): void {
    const em = this.email().trim();
    if (!validEmail(em)) { this.err.set(true); return; }
    withLoading(this.store, this.phase, () => this.nav.replace('/forgot/sent?email=' + encodeURIComponent(em)));
  }
}

@Component({
  selector: 'app-forgot-sent',
  imports: [IonHeader, IonContent, TopBarComponent],
  template: `
    <ion-header><app-top-bar title="Reset password" back="/login" [profile]="false" /></ion-header>
    <ion-content>
      <div class="sent">
        <span class="ms">mail</span>
        <h2 class="t-headline-small">Check your email</h2>
        <p class="intro">We sent a link to {{ email() || 'your email' }}. It can take a few minutes.</p>
        <button class="btn btn-filled m block" type="button" (click)="nav.root('/login')">Back to log in</button>
        <button class="btn btn-text" type="button" (click)="store.toast('We sent the link again')">Send the link again</button>
      </div>
    </ion-content>
  `,
})
export class ForgotSentPage {
  protected store = inject(StoreService);
  protected nav = inject(NavService);
  readonly email = input(''); // viene de ?email= (withComponentInputBinding)
}
