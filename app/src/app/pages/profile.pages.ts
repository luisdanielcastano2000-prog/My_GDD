// Perfil: Profile, Edit profile, Personal info, Password, My team, Language, Privacy and terms.
import { Component, type OnDestroy, computed, inject, signal } from '@angular/core';
import { IonContent, IonHeader } from '@ionic/angular';

import { ApiService, apiMessage } from '../data/api.service';
import { AVATAR_ICON, type Grant } from '../data/models';
import { StoreService, type Settings } from '../data/store.service';
import { lang, LANGS, LOCALE, t, tn, TPipe } from '../i18n/i18n';
import { accessText } from '../shared/grants.component';
import { NavService } from '../shared/nav.service';
import { SegComponent, SwitchComponent, TopBarComponent } from '../shared/ui';
import { VerifyBannerComponent } from '../shared/verify-banner.component';

@Component({
  selector: 'app-profile',
  imports: [TPipe, IonHeader, IonContent, TopBarComponent, SegComponent, SwitchComponent],
  template: `
    <ion-header class="cards"><app-top-bar [title]="'Profile' | t" back="/home" [profile]="false" /></ion-header>
    <ion-content class="page-cards">
      <div class="page" style="gap:8px">
        <div class="profile-head">
          <div class="pic">
            <span class="ms">{{ avatar() }}</span>
            <button class="icon-btn cam" type="button" [attr.aria-label]="'Change profile photo' | t" (click)="store.sheet.set({ k: 'avatar', av: u().av })"><span class="ms s20">photo_camera</span></button>
          </div>
          <h2>{{ u().name }}</h2>
          <p>{{ u().email }} · {{ count() }}</p>
          <button class="btn btn-tonal" type="button" (click)="nav.go('/profile/edit')">{{ 'Edit profile' | t }}</button>
        </div>

        <h2 class="section-title">{{ 'Account' | t }}</h2>
        <ul class="list card">
          <li><button class="li" type="button" (click)="nav.go('/profile/personal')"><span class="ms">person</span><span class="li-text"><span class="li-title">{{ 'Personal info' | t }}</span></span><span class="ms li-trail">chevron_right</span></button></li>
          <li><button class="li" type="button" (click)="nav.go('/profile/password')"><span class="ms">lock</span><span class="li-text"><span class="li-title">{{ 'Password' | t }}</span></span><span class="ms li-trail">chevron_right</span></button></li>
          <li><button class="li" type="button" (click)="nav.go('/profile/team')"><span class="ms">group</span><span class="li-text"><span class="li-title">{{ 'My team' | t }}</span><span class="li-sub">{{ teamN() }}</span></span><span class="ms li-trail">chevron_right</span></button></li>
        </ul>

        <h2 class="section-title">{{ 'Settings' | t }}</h2>
        <ul class="list card">
          <li class="setting"><span class="ms ic-muted">notifications</span><span class="li-text"><span class="li-title">{{ 'Notifications' | t }}</span><span class="li-sub">{{ 'Changes and team notes.' | t }}</span></span><app-switch [label]="'Notifications' | t" [on]="s().notifications" (changed)="set({ notifications: $event })" /></li>
          <li><button class="li" type="button" (click)="nav.go('/profile/language')"><span class="ms">language</span><span class="li-text"><span class="li-title">{{ 'Language' | t }}</span><span class="li-sub">{{ u().lang }}</span></span><span class="ms li-trail">chevron_right</span></button></li>
        </ul>

        <h2 class="section-title">{{ 'Accessibility' | t }}</h2>
        <ul class="list card">
          <li class="setting col">
            <span class="li-title">{{ 'Text size' | t }}</span>
            <app-seg [label]="'Text size' | t" [options]="['Default', 'Large', 'Larger']" [value]="s().textSize" (valueChange)="set({ textSize: $any($event) })" />
            <p class="preview">{{ 'Preview: Blockings may be out of date.' | t }}</p>
          </li>
          <li class="setting"><span class="li-text"><span class="li-title">{{ 'High contrast' | t }}</span><span class="li-sub">{{ 'Stronger borders and text.' | t }}</span></span><app-switch [label]="'High contrast' | t" [on]="s().highContrast" (changed)="set({ highContrast: $event })" /></li>
          <li class="setting"><span class="li-text"><span class="li-title">{{ 'Reduce motion' | t }}</span><span class="li-sub">{{ 'Fewer animations and transitions.' | t }}</span></span><app-switch [label]="'Reduce motion' | t" [on]="s().reduceMotion" (changed)="set({ reduceMotion: $event })" /></li>
        </ul>

        <h2 class="section-title">{{ 'Help and info' | t }}</h2>
        <ul class="list card">
          <li><button class="li" type="button" (click)="nav.go('/help')"><span class="ms">help</span><span class="li-text"><span class="li-title">{{ 'Help' | t }}</span></span><span class="ms li-trail">chevron_right</span></button></li>
          <li><button class="li" type="button" (click)="nav.go('/help/feedback')"><span class="ms">mail</span><span class="li-text"><span class="li-title">{{ 'Send feedback' | t }}</span></span><span class="ms li-trail">chevron_right</span></button></li>
          <li><button class="li" type="button" (click)="nav.go('/profile/privacy')"><span class="ms">shield</span><span class="li-text"><span class="li-title">{{ 'Privacy and terms' | t }}</span></span><span class="ms li-trail">chevron_right</span></button></li>
        </ul>
        <button class="li card" type="button" style="margin-top:8px;color:var(--gdd-error)" (click)="store.logout(); nav.root('/login')"><span class="ms" style="color:var(--gdd-error)">logout</span><span class="li-title" style="color:var(--gdd-error)">{{ 'Log out' | t }}</span></button>
        <p class="version">{{ 'My GDD · version 0.1' | t }}</p>
      </div>
    </ion-content>
  `,
})
export class ProfilePage {
  protected store = inject(StoreService);
  protected nav = inject(NavService);
  protected u = computed(() => this.store.data().user);
  protected s = this.store.settings;
  protected avatar = computed(() => AVATAR_ICON[this.u().av]);
  protected count = computed(() => tn(this.store.data().gdds.length, '{n} project', '{n} projects'));
  protected teamN = computed(() => tn(this.store.data().team.members.length, '{n} person', '{n} people'));
  set(p: Partial<Settings>): void { this.store.settings.update((s) => ({ ...s, ...p })); }
}

@Component({
  selector: 'app-edit-profile',
  imports: [TPipe, IonHeader, IonContent, TopBarComponent, SegComponent],
  template: `
    <ion-header><app-top-bar [title]="'Edit profile' | t" back="/profile" [profile]="false" /></ion-header>
    <ion-content>
      <form class="page" (submit)="$event.preventDefault(); save()" novalidate>
        <div class="profile-head">
          <div class="pic"><span class="ms">{{ avatar() }}</span></div>
          <button class="btn btn-text" type="button" (click)="store.sheet.set({ k: 'avatar', av: store.data().user.av })">{{ 'Change photo' | t }}</button>
        </div>
        <h2 class="section-title">{{ 'About you' | t }}</h2>
        <div class="field" [class.error]="errName()">
          <div class="field-box"><label for="ep-name">{{ 'Name' | t }}</label><input id="ep-name" autocomplete="name" [value]="name()" (input)="name.set($any($event.target).value); errName.set(false)" /></div>
          @if (errName()) { <span class="field-error">{{ 'Enter your name.' | t }}</span> }
        </div>
        <div class="field">
          <div class="field-box"><label for="ep-user">{{ 'User name' | t }}</label><input id="ep-user" [value]="user()" (input)="user.set($any($event.target).value)" /></div>
          <span class="field-help">{{ 'Your team sees it in notes and in My team.' | t }}</span>
        </div>
        <div class="field" [class.error]="errEmail()">
          <div class="field-box"><label for="ep-email">{{ 'Email' | t }}</label><input id="ep-email" type="email" autocomplete="email" [value]="email()" (input)="email.set($any($event.target).value); errEmail.set(false)" /></div>
          @if (errEmail()) { <span class="field-error">{{ 'Enter an email address, for example name@example.com.' | t }}</span> } @else { <span class="field-help">{{ 'If you change it, we’ll send a link to confirm the new email.' | t }}</span> }
        </div>
        <h2 class="section-title">{{ 'App appearance' | t }}</h2>
        <span class="t-label-large">{{ 'Theme' | t }}</span>
        <app-seg [label]="'Theme' | t" [options]="['Light', 'Dark', 'System']" [(value)]="theme" />
        <span class="t-label-large">{{ 'Accent color' | t }}</span>
        <div class="accents" role="radiogroup" [attr.aria-label]="'Accent color' | t">
          @for (a of accents; track a[0]) {
            <button type="button" role="radio" [class.on]="accent() === a[0]" [attr.aria-checked]="accent() === a[0]" [attr.aria-label]="a[0] | t" [style.background]="a[1]" (click)="pickAccent(a[0])">
              @if (accent() === a[0]) { <span class="ms s20">check</span> }
            </button>
          }
        </div>
        <p class="field-help" style="padding:0">{{ 'Changes buttons, links and selection. Tap Save to keep it.' | t }}</p>
        <button class="btn btn-filled m block" type="submit">{{ 'Save' | t }}</button>
      </form>
    </ion-content>
  `,
})
export class EditProfilePage implements OnDestroy {
  /** Vista previa del acento al tocarlo (se guarda con Save; al salir sin guardar, vuelve el de antes). */
  pickAccent(a: string): void {
    this.accent.set(a);
    this.store.previewAccent.set(a);
  }
  ngOnDestroy(): void {
    this.store.previewAccent.set(null);
  }
  protected store = inject(StoreService);
  private nav = inject(NavService);
  private u = this.store.data().user;
  protected avatar = computed(() => AVATAR_ICON[this.store.data().user.av]);
  protected accents: [string, string][] = [['Blue', '#3F48CC'], ['Green', '#1E7A3C'], ['Orange', '#E8603C'], ['Purple', '#7B4FC9'], ['Grey', '#78767D']];
  protected name = signal(this.u.name);
  protected user = signal(this.u.user);
  protected email = signal(this.u.email);
  protected theme = signal<string>(this.u.theme);
  protected accent = signal(this.u.accent);
  protected errName = signal(false);
  protected errEmail = signal(false);
  save(): void {
    const name = this.name().trim();
    const em = this.email().trim();
    this.errName.set(!name);
    this.errEmail.set(em.indexOf('@') < 1);
    if (this.errName() || this.errEmail()) return;
    this.store.saveProfile(name, this.user(), em, this.theme() as 'Light' | 'Dark' | 'System', this.accent());
    this.nav.back('/profile');
  }
}

@Component({
  selector: 'app-personal',
  imports: [TPipe, IonHeader, IonContent, TopBarComponent],
  template: `
    <ion-header><app-top-bar [title]="'Personal info' | t" back="/profile" [profile]="false" /></ion-header>
    <ion-content>
      <div class="page">
        <p class="intro">{{ 'Only you can see this information. Name, user name and email change in Edit profile.' | t }}</p>
        <h2 class="section-title">{{ 'Your details' | t }}</h2>
        <ul class="list card">
          @for (r of rows(); track r.k) {
            <li><button class="li" type="button" (click)="r.run()"><span class="li-text"><span class="li-sub">{{ r.k }}</span><span class="li-title">{{ r.v }}</span></span><span class="ms li-trail">chevron_right</span></button></li>
          }
        </ul>
        <p class="crumb">{{ 'Member since {p0}' | t: { p0: since() } }}</p>
        <h2 class="section-title">{{ 'Your data' | t }}</h2>
        <ul class="list card">
          <li><button class="li" type="button" (click)="store.downloadData()"><span class="ms">download</span><span class="li-title">{{ 'Download my data' | t }}</span></button></li>
          <li><button class="li" type="button" style="color:var(--gdd-error)" (click)="store.dialog.set({ k: 'del', what: 'account' })"><span class="ms" style="color:var(--gdd-error)">delete</span><span class="li-title" style="color:var(--gdd-error)">{{ 'Delete account' | t }}</span></button></li>
        </ul>
      </div>
    </ion-content>
  `,
})
export class PersonalPage {
  protected store = inject(StoreService);
  private nav = inject(NavService);
  /** «November 2026» (fecha de alta de la cuenta; los datos de ejemplo no la tienen). */
  protected since = computed(() => {
    const since = this.store.since();
    return since ? new Date(since).toLocaleDateString(LOCALE[lang()], { month: 'long', year: 'numeric' }) : 'October 2026';
  });
  protected rows = computed(() => {
    const u = this.store.data().user;
    const edit = () => this.nav.go('/profile/edit');
    const field = (key: 'phone' | 'country' | 'tz', label: string) => () => this.store.dialog.set({ k: 'rename', what: 'field', key, label, val: u[key], err: false });
    return [
      { k: t('Name'), v: u.name, run: edit },
      { k: t('User name'), v: '@' + u.user, run: edit },
      { k: t('Email'), v: this.store.pendingEmail() ? t('{email} · Waiting for you to confirm {next}', { email: u.email, next: this.store.pendingEmail() }) : u.email, run: edit },
      { k: t('Phone'), v: u.phone || t('Not added'), run: field('phone', 'Phone') },
      { k: t('Country or region'), v: u.country || t('Not added'), run: field('country', 'Country or region') },
      { k: t('Time zone'), v: u.tz || t('Not added'), run: field('tz', 'Time zone') },
    ];
  });
}

@Component({
  selector: 'app-password',
  imports: [TPipe, IonHeader, IonContent, TopBarComponent, SwitchComponent],
  template: `
    <ion-header><app-top-bar [title]="'Password' | t" back="/profile" [profile]="false" /></ion-header>
    <ion-content>
      <form class="page" (submit)="$event.preventDefault(); update()" novalidate>
        <h2 class="section-title">{{ 'Change password' | t }}</h2>
        @for (f of fields; track f.key) {
          <div class="field" [class.error]="perr() === f.key">
            <div class="field-box">
              <label [for]="'pw-' + f.key">{{ f.label | t }}</label>
              <input [id]="'pw-' + f.key" [type]="show() ? 'text' : 'password'" [autocomplete]="f.key === 'cur' ? 'current-password' : 'new-password'" [value]="vals()[f.key]" (input)="setVal(f.key, $any($event.target).value)" />
              <button class="icon-btn trail" type="button" [attr.aria-label]="(show() ? 'Hide passwords' : 'Show passwords') | t" (click)="show.set(!show())"><span class="ms">{{ show() ? 'visibility_off' : 'visibility' }}</span></button>
            </div>
            @if (perr() === f.key) { <span class="field-error">{{ (f.key === 'cur' ? curMsg() : f.err) | t }}</span> } @else if (f.key === 'nw') { <span class="field-help">{{ 'At least 8 characters.' | t }}</span> }
          </div>
        }
        <button class="btn btn-filled m block" type="submit">{{ 'Update password' | t }}</button>
        <button class="btn btn-text" type="button" style="align-self:center" (click)="forgot()">{{ 'Forgot your current password?' | t }}</button>
        <h2 class="section-title">{{ 'Security' | t }}</h2>
        <ul class="list card">
          <li class="setting"><span class="li-text"><span class="li-title">{{ 'Two-step verification' | t }}</span><span class="li-sub">{{ 'Ask for a code when you log in on a new device.' | t }}</span></span><app-switch [label]="'Two-step verification' | t" [(on)]="tfa" /></li>
          <li><button class="li" type="button" (click)="store.logoutOthers()"><span class="ms">logout</span><span class="li-title">{{ 'Log out of other devices' | t }}</span></button></li>
        </ul>
      </form>
    </ion-content>
  `,
})
export class PasswordPage {
  protected store = inject(StoreService);
  /** «Forgot your current password?»: manda el enlace para crear una nueva. */
  forgot(): void {
    const em = this.store.data().user.email;
    if (!this.store.live()) { this.store.toast(t('We sent a reset link to {email}.', { email: em })); return; } // selector de pantallas
    this.api.forgot(em).then(
      (r) => this.store.toast(r.mail ? t('We sent a reset link to {email}.', { email: em }) : t('Email isn’t set up in this app yet, so we can’t send the link.'), r.mail ? {} : { kind: 'err' }),
      (e: unknown) => this.store.toast(apiMessage(e), { kind: 'err' }),
    );
  }
  protected fields: { key: 'cur' | 'nw' | 'cf'; label: string; err: string }[] = [
    { key: 'cur', label: 'Current password', err: 'Enter your current password.' },
    { key: 'nw', label: 'New password', err: 'The new password needs at least 8 characters.' },
    { key: 'cf', label: 'Confirm new password', err: 'The new passwords don’t match.' },
  ];
  private api = inject(ApiService);
  protected curMsg = signal('Enter your current password.');
  protected vals = signal({ cur: '', nw: '', cf: '' });
  protected perr = signal<'' | 'cur' | 'nw' | 'cf'>('');
  protected show = signal(false);
  protected tfa = signal(false);
  setVal(k: 'cur' | 'nw' | 'cf', v: string): void { this.vals.update((x) => ({ ...x, [k]: v })); this.perr.set(''); }
  update(): void {
    const { cur, nw, cf } = this.vals();
    if (!cur) { this.curMsg.set('Enter your current password.'); this.perr.set('cur'); return; }
    if (nw.length < 8) { this.perr.set('nw'); return; }
    if (nw !== cf) { this.perr.set('cf'); return; }
    const ok = () => { this.vals.set({ cur: '', nw: '', cf: '' }); this.store.toast(t('Password updated. Use it the next time you log in.')); };
    if (!this.store.live()) { ok(); return; }
    this.api.changePassword(cur, nw).then(ok, (e: unknown) => {
      const m = apiMessage(e, false);
      if (m === 'The current password is incorrect.') { this.curMsg.set(m); this.perr.set('cur'); } else this.store.toast(t(m), { kind: 'err' });
    });
  }
}

@Component({
  selector: 'app-team',
  imports: [TPipe, IonHeader, IonContent, TopBarComponent, VerifyBannerComponent],
  template: `
    <ion-header><app-top-bar [title]="'My team' | t" back="/profile" [profile]="false" /></ion-header>
    <ion-content>
      <app-verify-banner />
      <div class="page with-fab">
        <p class="intro">{{ 'People who can see your GDDs and get your notes.' | t }}</p>
        <h2 class="section-title">{{ 'Members · {p0}' | t: { p0: team().members.length } }}</h2>
        <ul class="list card">
          @for (m of team().members; track m.id) {
            <li class="setting" style="min-height:72px" [class.slide-out]="store.dying() === m.id" [attr.data-flip]="m.id">
              <span class="member-ini" [class.you]="m.you">{{ m.name.charAt(0).toUpperCase() }}</span>
              <span class="li-text"><span class="li-title">{{ m.you ? ('{name} (you)' | t: { name: m.name }) : m.name }}</span><span class="li-sub">{{ m.you ? (m.role | t) : access(m.role, m.grants) }}</span></span>
              @if (!m.you) { <button class="btn btn-outlined" type="button" (click)="store.sheet.set({ k: 'manage', id: m.id, role: m.role, grants: m.grants })">{{ 'Manage' | t }}</button> }
            </li>
          }
        </ul>
        @if (team().invites.length) {
          <h2 class="section-title">{{ 'Pending invitations · {p0}' | t: { p0: team().invites.length } }}</h2>
          <ul class="list card">
            @for (v of team().invites; track v.id) {
              <li class="setting">
                <span class="ms ic-muted">send</span>
                <span class="li-text"><span class="li-title">{{ v.email }}</span><span class="li-sub">{{ '{p0} · Waiting for them to accept' | t: { p0: access(v.role, v.grants) } }}</span></span>
                <button class="icon-btn" type="button" [attr.aria-label]="'Resend invitation to {email}' | t: { email: v.email }" (click)="store.resendInvite(v.email)"><span class="ms">refresh</span></button>
                <button class="icon-btn" type="button" [attr.aria-label]="'Cancel invitation to {email}' | t: { email: v.email }" (click)="store.cancelInvite(v.id)"><span class="ms">close</span></button>
              </li>
            }
          </ul>
        }
        @if (store.invitations().length) {
          <h2 class="section-title">{{ 'Invitations for you · {p0}' | t: { p0: store.invitations().length } }}</h2>
          <ul class="list card">
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
        }
        @if (store.teams().length) {
          <h2 class="section-title">{{ 'Teams you’re in · {p0}' | t: { p0: store.teams().length } }}</h2>
          <ul class="list card">
            @for (t of store.teams(); track t.owner) {
              <li class="setting">
                <span class="member-ini">{{ t.name.charAt(0).toUpperCase() }}</span>
                <span class="li-text"><span class="li-title">{{ '{p0}’s team' | t: { p0: t.name } }}</span><span class="li-sub">You’re {{ t.role === 'Viewer' ? 'a viewer' : 'an editor' }}</span></span>
                <button class="btn btn-outlined" type="button" (click)="store.leaveTeam(t)">{{ 'Leave' | t }}</button>
              </li>
            }
          </ul>
        }
        <p class="crumb">{{ 'Editor: can write blocks and send notes (only in their departments, if you choose some). Viewer: can read the GDD and send notes. People only see the projects you share with them.' | t }}</p>
      </div>
      <button class="fab" slot="fixed" type="button" (click)="store.sheet.set({ k: 'invite', email: '', role: 'Editor', err: false })"><span class="ms">add</span>{{ 'Invite member' | t }}</button>
    </ion-content>
  `,
})
export class TeamPage {
  protected store = inject(StoreService);
  protected access = (role: string, grants?: Grant[]): string => accessText(role, grants, this.store.ownGdds().length);
  protected team = computed(() => this.store.data().team);
}

@Component({
  selector: 'app-language',
  imports: [TPipe, IonHeader, IonContent, TopBarComponent],
  template: `
    <ion-header><app-top-bar [title]="'Language' | t" back="/profile" [profile]="false" /></ion-header>
    <ion-content>
      <div class="page">
        <p class="intro">{{ 'Choose the language of the app. The text of your GDDs doesn’t change.' | t }}</p>
        <div class="list card" role="radiogroup" [attr.aria-label]="'Language' | t">
          @for (l of langs; track l[0]) {
            <button class="li" type="button" role="radio" [attr.aria-checked]="store.data().user.lang === l[0]" [attr.aria-disabled]="!ready(l[0])" [class.soon]="!ready(l[0])" (click)="store.setLang(l[0])">
              <span class="radio" [class.on]="store.data().user.lang === l[0]"></span>
              <span class="li-text"><span class="li-title">{{ l[0] }}</span><span class="li-sub">{{ l[1] | t }}{{ ready(l[0]) ? '' : ' · ' + ('Coming soon' | t) }}</span></span>
            </button>
          }
        </div>
      </div>
    </ion-content>
  `,
})
export class LanguagePage {
  protected store = inject(StoreService);
  /** ¿Tiene traducción? (inglés, español y catalán; el resto, más adelante) */
  protected ready = (name: string): boolean => name in LANGS;
  protected langs = [['English', 'English'], ['Español', 'Spanish'], ['Català', 'Catalan'], ['Deutsch', 'German'], ['Français', 'French'], ['Italiano', 'Italian'], ['Português', 'Portuguese'], ['日本語', 'Japanese'], ['한국어', 'Korean'], ['中文 (简体)', 'Chinese, simplified']];
}

@Component({
  selector: 'app-privacy',
  imports: [TPipe, IonHeader, IonContent, TopBarComponent],
  template: `
    <ion-header><app-top-bar [title]="'Privacy and terms' | t" back="/profile" [profile]="false" /></ion-header>
    <ion-content>
      <div class="page prose">
        <p>{{ 'A short summary. Last updated: October 2026.' | t }}</p>
        <h3>{{ 'What we save' | t }}</h3>
        <p>{{ 'Your GDDs, the notes you send and receive, and the basic details of your account.' | t }}</p>
        <h3>{{ 'Who can see your GDDs' | t }}</h3>
        <p>{{ 'Only you and the people in My team. Viewers can read; editors can also write.' | t }}</p>
        <h3>{{ 'Your choices' | t }}</h3>
        <p>{{ 'You can download your data or delete your account in Personal info at any time.' | t }}</p>
        <h3>{{ 'Terms of use' | t }}</h3>
        <p>{{ 'You own what you write in My GDD. Don’t share content that isn’t yours.' | t }}</p>
      </div>
    </ion-content>
  `,
})
export class PrivacyPage {}
