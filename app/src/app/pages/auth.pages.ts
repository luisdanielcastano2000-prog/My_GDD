// Acceso: Log in, Sign up, Reset password (formulario y «Check your email»).
import { HttpErrorResponse } from '@angular/common/http';
import { Component, type OnInit, computed, inject, input, signal, type WritableSignal } from '@angular/core';
import { IonContent, IonHeader } from '@ionic/angular';

import { ApiService, apiMessage } from '../data/api.service';
import { StoreService } from '../data/store.service';
import { t, TPipe } from '../i18n/i18n';
import { NavService } from '../shared/nav.service';
import { BrandComponent, TopBarComponent } from '../shared/ui';

/** Botón con carga: texto → spinner (mín. 400 ms) → check en verde → sigue. */
export function withLoading(
  store: StoreService,
  phase: WritableSignal<'' | 'load' | 'ok'>,
  done: () => void,
  fromLoad = false,
): void {
  // Evita envíos dobles; fromLoad = el spinner ya estaba girando mientras respondía el servidor
  if (phase() === 'ok' || (phase() === 'load' && !fromLoad)) return;
  const k = store.settings().slowMotion ? 4 : 1;
  if (store.settings().reduceMotion) {
    done();
    return;
  }
  phase.set('load');
  setTimeout(() => {
    phase.set('ok');
    setTimeout(() => {
      phase.set('');
      done();
    }, 650 * k);
  }, 400 * k);
}

const validEmail = (e: string): boolean => e.trim().indexOf('@') > 0;

@Component({
  selector: 'app-login',
  imports: [TPipe, IonContent, BrandComponent],
  template: `
    <ion-content>
      <form class="auth" (submit)="$event.preventDefault(); submit()" novalidate>
        <div class="logo">
          <app-brand />
          <p class="tagline">{{ 'Your GDD, structured and up to date.' | t }}</p>
        </div>
        @if (ticket()) {
          <!-- Segundo paso (verificación en dos pasos): el código que llega por correo -->
          <div>
            <h2><span class="ms ic-muted">mark_email_unread</span>{{ 'Check your email' | t }}</h2>
            <p class="li-sub">
              {{ 'We sent a 6-digit code to {email}. It works for 10 minutes.' | t: { email: email().trim() } }}
            </p>
          </div>
          <div class="field" [class.error]="!!codeErr()">
            <div class="field-box">
              <label for="lg-code">{{ 'Code' | t }}</label>
              <input
                id="lg-code"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6"
                [value]="code()"
                (input)="setCode($any($event.target))"
              />
            </div>
            @if (codeErr()) {
              <span class="field-error" role="alert">{{ codeErr() | t }}</span>
            }
          </div>
          <button
            class="btn btn-filled m block"
            type="submit"
            [class.ok]="phase() === 'ok'"
            [attr.aria-busy]="!!phase()"
          >
            @switch (phase()) {
              @case ('load') {
                <span class="spin"></span>{{ 'Logging in' | t }}
              }
              @case ('ok') {
                <span class="ms">check</span>{{ 'Logged in' | t }}
              }
              @default {
                {{ 'Log in' | t }}
              }
            }
          </button>
          <button class="btn btn-text" type="button" style="align-self:center" (click)="resend()">
            {{ 'Send a new code' | t }}
          </button>
          <button class="btn btn-text" type="button" style="align-self:center" (click)="back()">
            {{ 'Back' | t }}
          </button>
        } @else {
          <h2><span class="ms ic-muted">account_circle</span>{{ 'Log in' | t }}</h2>
          <div class="field" [class.error]="errEmail()">
            <div class="field-box">
              <label for="lg-email">{{ 'Email' | t }}</label>
              <input
                id="lg-email"
                type="email"
                autocomplete="email"
                [value]="email()"
                (input)="email.set($any($event.target).value); clear()"
              />
            </div>
            @if (errEmail()) {
              <span class="field-error">{{ 'Enter your email.' | t }}</span>
            }
          </div>
          <div class="field" [class.error]="errPw()">
            <div class="field-box">
              <label for="lg-pw">{{ 'Password' | t }}</label>
              <input
                id="lg-pw"
                [type]="show() ? 'text' : 'password'"
                autocomplete="current-password"
                [value]="pw()"
                (input)="pw.set($any($event.target).value); clear()"
              />
              <button
                class="icon-btn trail"
                type="button"
                [attr.aria-label]="(show() ? 'Hide password' : 'Show password') | t"
                (click)="show.set(!show())"
              >
                <span class="ms">{{ show() ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
            @if (errPw()) {
              <span class="field-error">{{ 'Enter your password.' | t }}</span>
            }
          </div>
          @if (bad()) {
            <p class="bad" role="alert">
              {{ 'The email or password is incorrect. Try again or reset your password.' | t }}
            </p>
          }
          <button class="btn btn-text" type="button" style="align-self:flex-start;margin-left:-12px" (click)="forgot()">
            {{ 'Forgot password?' | t }}
          </button>
          <button
            class="btn btn-filled m block"
            type="submit"
            [class.ok]="phase() === 'ok'"
            [attr.aria-busy]="!!phase()"
          >
            @switch (phase()) {
              @case ('load') {
                <span class="spin"></span>{{ 'Logging in' | t }}
              }
              @case ('ok') {
                <span class="ms">check</span>{{ 'Logged in' | t }}
              }
              @default {
                {{ 'Log in' | t }}
              }
            }
          </button>
          <p class="alt">
            {{ 'Don’t have an account?' | t }}
            <button class="btn btn-text" type="button" (click)="nav.go('/signup')">{{ 'Sign up' | t }}</button>
          </p>
        }
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
  // Dos pasos: ticket del servidor (hay que poner el código del correo), el código y su error
  protected ticket = signal<string | null>(null);
  protected code = signal('');
  protected codeErr = signal('');

  clear(): void {
    this.errEmail.set(false);
    this.errPw.set(false);
    this.bad.set(false);
  }
  submit(): void {
    if (this.ticket()) return this.submitCode();
    const em = this.email().trim();
    this.errEmail.set(!em);
    this.errPw.set(!this.pw());
    this.bad.set(!!em && !!this.pw() && !validEmail(em));
    if (this.errEmail() || this.errPw() || this.bad()) return;
    if (this.phase()) return;
    this.phase.set('load');
    this.store.login(em, this.pw()).then(
      (ticket) => {
        if (!ticket) return withLoading(this.store, this.phase, () => this.nav.root('/home'), true);
        this.phase.set('');
        this.code.set('');
        this.codeErr.set('');
        this.ticket.set(ticket);
        setTimeout(() => document.getElementById('lg-code')?.focus());
      },
      (e: unknown) => {
        this.phase.set('');
        if (e instanceof HttpErrorResponse && e.status === 401) this.bad.set(true);
        else this.store.toast(apiMessage(e), { kind: 'err' });
      },
    );
  }
  /** Solo cifras (también si se pega «123 456»). */
  setCode(el: HTMLInputElement): void {
    const v = el.value.replace(/\D/g, '').slice(0, 6);
    if (el.value !== v) el.value = v;
    this.code.set(v);
    this.codeErr.set('');
  }
  submitCode(): void {
    const ticket = this.ticket();
    if (!ticket || this.phase()) return;
    if (!/^\d{6}$/.test(this.code())) {
      this.codeErr.set('Enter the 6-digit code.');
      return;
    }
    this.phase.set('load');
    this.store.loginCode(ticket, this.code()).then(
      () => withLoading(this.store, this.phase, () => this.nav.root('/home'), true),
      (e: unknown) => {
        this.phase.set('');
        if (e instanceof HttpErrorResponse && (e.status === 400 || e.status === 401))
          this.codeErr.set(apiMessage(e, false));
        else this.store.toast(apiMessage(e), { kind: 'err' });
      },
    );
  }
  /** «Send a new code»: vuelve a entrar con la misma contraseña (el código anterior deja de valer). */
  resend(): void {
    if (this.phase()) return;
    this.store.login(this.email().trim(), this.pw()).then(
      (ticket) => {
        this.code.set('');
        this.codeErr.set('');
        if (ticket) {
          this.ticket.set(ticket);
          this.store.toast(t('We sent a new code to {email}.', { email: this.email().trim() }));
        } else withLoading(this.store, this.phase, () => this.nav.root('/home'), true);
      },
      (e: unknown) => this.store.toast(apiMessage(e), { kind: 'err' }),
    );
  }
  back(): void {
    this.ticket.set(null);
    this.code.set('');
    this.codeErr.set('');
  }
  forgot(): void {
    this.store.setDraft('forgot', { email: this.email() });
    this.nav.go('/forgot');
  }
}

@Component({
  selector: 'app-signup',
  imports: [TPipe, IonContent, BrandComponent],
  template: `
    <ion-content>
      <form class="auth" (submit)="$event.preventDefault(); submit()" novalidate>
        <div class="logo">
          <app-brand />
          <p class="tagline">{{ 'Your GDD, structured and up to date.' | t }}</p>
        </div>
        <div>
          <h2>{{ 'Sign up' | t }}</h2>
          <p class="li-sub">{{ 'Create your account to start your GDD.' | t }}</p>
        </div>
        <div class="field" [class.error]="errUser()">
          <div class="field-box">
            <label for="su-user">{{ 'User name' | t }}</label>
            <input
              id="su-user"
              autocomplete="username"
              [value]="user()"
              (input)="user.set($any($event.target).value); errUser.set(false)"
            />
          </div>
          @if (errUser()) {
            <span class="field-error">{{ 'Enter a user name.' | t }}</span>
          }
        </div>
        <div class="field" [class.error]="!!errEmail()">
          <div class="field-box">
            <label for="su-email">{{ 'Email' | t }}</label>
            <input
              id="su-email"
              type="email"
              autocomplete="email"
              [value]="email()"
              (input)="email.set($any($event.target).value); errEmail.set('')"
            />
          </div>
          @if (errEmail()) {
            <span class="field-error">{{ errEmail() | t }}</span>
          }
          @if (errEmail() === taken) {
            <button class="btn btn-text" type="button" style="align-self:flex-start" (click)="loginWith()">
              {{ 'Log in with this email' | t }}
            </button>
          }
        </div>
        <div class="field" [class.error]="errPw()">
          <div class="field-box">
            <label for="su-pw">{{ 'Password' | t }}</label>
            <input
              id="su-pw"
              [type]="show() ? 'text' : 'password'"
              autocomplete="new-password"
              [value]="pw()"
              (input)="pw.set($any($event.target).value); errPw.set(false)"
            />
            <button
              class="icon-btn trail"
              type="button"
              [attr.aria-label]="(show() ? 'Hide password' : 'Show password') | t"
              (click)="show.set(!show())"
            >
              <span class="ms">{{ show() ? 'visibility_off' : 'visibility' }}</span>
            </button>
          </div>
          @if (errPw()) {
            <span class="field-error">{{ 'The password needs at least 8 characters.' | t }}</span>
          } @else {
            <span class="field-help">{{ 'At least 8 characters.' | t }}</span>
          }
        </div>
        <button class="btn btn-filled m block" type="submit" [class.ok]="phase() === 'ok'" [attr.aria-busy]="!!phase()">
          @switch (phase()) {
            @case ('load') {
              <span class="spin"></span>{{ 'Creating your account' | t }}
            }
            @case ('ok') {
              <span class="ms">check</span>{{ 'Account created' | t }}
            }
            @default {
              {{ 'Sign up' | t }}
            }
          }
        </button>
        <p class="alt">
          {{ 'Already have an account?' | t }}
          <button class="btn btn-text" type="button" (click)="nav.root('/login')">{{ 'Log in' | t }}</button>
        </p>
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
    this.errEmail.set(
      !validEmail(em)
        ? 'Enter an email address, for example name@example.com.'
        : em === this.store.data().user.email
          ? this.taken
          : '',
    );
    this.errPw.set(this.pw().length < 8);
    if (this.errUser() || this.errEmail() || this.errPw()) return;
    if (this.phase()) return;
    this.phase.set('load');
    this.store.signup(u, em, this.pw()).then(
      () => withLoading(this.store, this.phase, () => this.nav.root('/home'), true),
      (e: unknown) => {
        this.phase.set('');
        const m = apiMessage(e);
        if (e instanceof HttpErrorResponse && e.status === 409) this.errEmail.set(this.taken);
        else if (e instanceof HttpErrorResponse && e.status === 400)
          this.errEmail.set(apiMessage(e, false)); // en inglés: la plantilla lo traduce
        else this.store.toast(m, { kind: 'err' });
      },
    );
  }
  loginWith(): void {
    this.store.setDraft('login', { email: this.email() });
    this.nav.root('/login');
  }
}

@Component({
  selector: 'app-forgot',
  imports: [TPipe, IonHeader, IonContent, TopBarComponent],
  template: `
    <ion-header><app-top-bar [title]="'Reset password' | t" back="/login" [profile]="false" /></ion-header>
    <ion-content>
      <form class="page" (submit)="$event.preventDefault(); send()" novalidate>
        <p class="intro">
          {{ 'Enter the email of your account. We’ll send you a link to create a new password.' | t }}
        </p>
        <div class="field" [class.error]="err()">
          <div class="field-box">
            <label for="fg-email">{{ 'Email' | t }}</label>
            <input
              id="fg-email"
              type="email"
              autocomplete="email"
              [value]="email()"
              (input)="email.set($any($event.target).value); err.set(false)"
            />
          </div>
          @if (err()) {
            <span class="field-error">{{ 'Enter the email of your account, for example name@example.com.' | t }}</span>
          }
        </div>
        <button class="btn btn-filled m block" type="submit" [class.ok]="phase() === 'ok'" [attr.aria-busy]="!!phase()">
          @switch (phase()) {
            @case ('load') {
              <span class="spin"></span>{{ 'Sending the link' | t }}
            }
            @case ('ok') {
              <span class="ms">check</span>{{ 'Link sent' | t }}
            }
            @default {
              {{ 'Send link' | t }}
            }
          }
        </button>
      </form>
    </ion-content>
  `,
})
export class ForgotPage {
  private store = inject(StoreService);
  private nav = inject(NavService);
  private api = inject(ApiService);
  protected email = signal(this.store.takeDraft('forgot', { email: '' }).email);
  protected err = signal(false);
  protected phase = signal<'' | 'load' | 'ok'>('');

  send(): void {
    const em = this.email().trim();
    if (!validEmail(em)) {
      this.err.set(true);
      return;
    }
    if (this.phase()) return;
    this.phase.set('load');
    // El servidor manda el enlace (si la cuenta existe; responde igual si no, para no decir qué cuentas hay)
    this.api.forgot(em).then(
      (r) => {
        if (!r.mail) {
          this.phase.set('');
          this.store.toast(t('Email isn’t set up in this app yet, so we can’t send the link.'), { kind: 'err' });
          return;
        }
        withLoading(
          this.store,
          this.phase,
          () => this.nav.replace('/forgot/sent?email=' + encodeURIComponent(em)),
          true,
        );
      },
      (e: unknown) => {
        this.phase.set('');
        this.store.toast(apiMessage(e), { kind: 'err' });
      },
    );
  }
}

@Component({
  selector: 'app-forgot-sent',
  imports: [TPipe, IonHeader, IonContent, TopBarComponent],
  template: `
    <ion-header><app-top-bar [title]="'Reset password' | t" back="/login" [profile]="false" /></ion-header>
    <ion-content>
      <div class="sent-msg">
        <span class="ms">mail</span>
        <h2 class="t-headline-small">{{ 'Check your email' | t }}</h2>
        <p class="intro">
          {{ 'We sent a link to {p0}. It can take a few minutes.' | t: { p0: email() || 'your email' } }}
        </p>
        <button class="btn btn-filled m block" type="button" (click)="nav.root('/login')">
          {{ 'Back to log in' | t }}
        </button>
        <button class="btn btn-text" type="button" (click)="again()">{{ 'Send the link again' | t }}</button>
      </div>
    </ion-content>
  `,
})
export class ForgotSentPage {
  protected store = inject(StoreService);
  protected nav = inject(NavService);
  private api = inject(ApiService);
  readonly email = input(''); // viene de ?email= (withComponentInputBinding)
  again(): void {
    if (!validEmail(this.email())) {
      this.store.toast(t('We sent the link again'));
      return;
    } // selector de pantallas
    this.api.forgot(this.email()).then(
      () => this.store.toast(t('We sent the link again')),
      (e: unknown) => this.store.toast(apiMessage(e), { kind: 'err' }),
    );
  }
}

/** /verify?token= : el enlace de los correos (verificar la cuenta o confirmar un email nuevo). */
@Component({
  selector: 'app-verify',
  imports: [TPipe, IonHeader, IonContent, TopBarComponent],
  template: `
    <ion-header><app-top-bar title="My GDD" [profile]="false" /></ion-header>
    <ion-content>
      <div class="sent-msg">
        @switch (state()) {
          @case ('load') {
            <span class="spin" [attr.aria-label]="'Checking the link' | t"></span>
          }
          @case ('ok') {
            <span class="ms ic-ok">mark_email_read</span>
            <h2 class="t-headline-small">{{ (kind() === 'email' ? 'New email confirmed' : 'Email verified') | t }}</h2>
            <p class="intro">
              {{
                kind() === 'email'
                  ? ('Your account now uses {email}.' | t: { email: email() })
                  : ('You can now invite people and join teams.' | t)
              }}
            </p>
            <button class="btn btn-filled m block" type="button" (click)="go()">
              {{ (logged() ? 'Continue' : 'Log in') | t }}
            </button>
          }
          @default {
            <span class="ms">link_off</span>
            <h2 class="t-headline-small">{{ 'This link doesn’t work' | t }}</h2>
            <p class="intro">{{ error() }}</p>
            <button class="btn btn-filled m block" type="button" (click)="go()">
              {{ (logged() ? 'Go to Home' : 'Log in') | t }}
            </button>
          }
        }
      </div>
    </ion-content>
  `,
})
export class VerifyPage implements OnInit {
  private store = inject(StoreService);
  private api = inject(ApiService);
  private nav = inject(NavService);
  readonly token = input(''); // ?token=
  protected state = signal<'load' | 'ok' | 'err'>('load');
  protected kind = signal<'verify' | 'email'>('verify');
  protected email = signal('');
  protected error = signal('');
  protected logged = computed(() => !!this.api.token);
  ngOnInit(): void {
    this.api.verify(this.token()).then(
      async (r) => {
        this.kind.set(r.kind);
        this.email.set(r.email);
        this.state.set('ok');
        if (this.api.token) await this.store.load(); // con sesión abierta: ya verificado / email nuevo en pantalla
      },
      (e: unknown) => {
        this.error.set(apiMessage(e));
        this.state.set('err');
      },
    );
  }
  go(): void {
    this.nav.root(this.api.token ? '/home' : '/login');
  }
}

/** /reset?token= : crear una contraseña nueva con el enlace del correo. */
@Component({
  selector: 'app-reset',
  imports: [TPipe, IonHeader, IonContent, TopBarComponent],
  template: `
    <ion-header><app-top-bar [title]="'New password' | t" back="/login" [profile]="false" /></ion-header>
    <ion-content>
      <form class="page" (submit)="$event.preventDefault(); save()" novalidate>
        <p class="intro">
          {{ 'Create a new password for your account. You’ll be logged out of all your devices.' | t }}
        </p>
        <div class="field" [class.error]="err() === 'pw'">
          <div class="field-box">
            <label for="rs-pw">{{ 'New password' | t }}</label>
            <input
              id="rs-pw"
              [type]="show() ? 'text' : 'password'"
              autocomplete="new-password"
              [value]="pw()"
              (input)="pw.set($any($event.target).value); err.set('')"
            />
            <button
              class="icon-btn trail"
              type="button"
              [attr.aria-label]="(show() ? 'Hide password' : 'Show password') | t"
              (click)="show.set(!show())"
            >
              <span class="ms">{{ show() ? 'visibility_off' : 'visibility' }}</span>
            </button>
          </div>
          @if (err() === 'pw') {
            <span class="field-error">{{ 'The password needs at least 8 characters.' | t }}</span>
          } @else {
            <span class="field-help">{{ 'At least 8 characters.' | t }}</span>
          }
        </div>
        <div class="field" [class.error]="err() === 'cf'">
          <div class="field-box">
            <label for="rs-cf">{{ 'Confirm new password' | t }}</label>
            <input
              id="rs-cf"
              [type]="show() ? 'text' : 'password'"
              autocomplete="new-password"
              [value]="cf()"
              (input)="cf.set($any($event.target).value); err.set('')"
            />
          </div>
          @if (err() === 'cf') {
            <span class="field-error">{{ 'The passwords don’t match.' | t }}</span>
          }
        </div>
        <button class="btn btn-filled m block" type="submit" [class.ok]="phase() === 'ok'" [attr.aria-busy]="!!phase()">
          @switch (phase()) {
            @case ('load') {
              <span class="spin"></span>{{ 'Saving' | t }}
            }
            @case ('ok') {
              <span class="ms">check</span>{{ 'Password saved' | t }}
            }
            @default {
              {{ 'Save password' | t }}
            }
          }
        </button>
      </form>
    </ion-content>
  `,
})
export class ResetPage {
  private store = inject(StoreService);
  private api = inject(ApiService);
  private nav = inject(NavService);
  readonly token = input(''); // ?token=
  protected pw = signal('');
  protected cf = signal('');
  protected show = signal(false);
  protected err = signal<'' | 'pw' | 'cf'>('');
  protected phase = signal<'' | 'load' | 'ok'>('');
  save(): void {
    if (this.pw().length < 8) {
      this.err.set('pw');
      return;
    }
    if (this.pw() !== this.cf()) {
      this.err.set('cf');
      return;
    }
    if (this.phase()) return;
    this.phase.set('load');
    this.api.resetPassword(this.token(), this.pw()).then(
      () =>
        withLoading(
          this.store,
          this.phase,
          () => {
            if (this.api.token) this.store.logout(); // la sesión de este aparato también se cerró
            this.nav.root('/login');
            this.store.toast(t('Password changed. Log in with your new password.'), { kind: 'ok' });
          },
          true,
        ),
      (e: unknown) => {
        this.phase.set('');
        this.store.toast(apiMessage(e), { kind: 'err' });
      },
    );
  }
}
