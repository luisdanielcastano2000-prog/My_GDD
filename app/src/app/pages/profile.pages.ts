// Perfil: Profile, Edit profile, Personal info, Password, My team, Language, Privacy and terms.
import { Component, computed, inject, signal } from '@angular/core';
import { IonContent, IonHeader } from '@ionic/angular';

import { ApiService, apiMessage } from '../data/api.service';
import { AVATAR_ICON } from '../data/models';
import { StoreService, type Settings } from '../data/store.service';
import { NavService } from '../shared/nav.service';
import { SegComponent, SwitchComponent, TopBarComponent } from '../shared/ui';

@Component({
  selector: 'app-profile',
  imports: [IonHeader, IonContent, TopBarComponent, SegComponent, SwitchComponent],
  template: `
    <ion-header class="cards"><app-top-bar title="Profile" back="/home" [profile]="false" /></ion-header>
    <ion-content class="page-cards">
      <div class="page" style="gap:8px">
        <div class="profile-head">
          <div class="pic">
            <span class="ms">{{ avatar() }}</span>
            <button class="icon-btn cam" type="button" aria-label="Change profile photo" (click)="store.sheet.set({ k: 'avatar', av: u().av })"><span class="ms s20">photo_camera</span></button>
          </div>
          <h2>{{ u().name }}</h2>
          <p>{{ u().email }} · {{ count() }}</p>
          <button class="btn btn-tonal" type="button" (click)="nav.go('/profile/edit')">Edit profile</button>
        </div>

        <h2 class="section-title">Account</h2>
        <ul class="list card">
          <li><button class="li" type="button" (click)="nav.go('/profile/personal')"><span class="ms">person</span><span class="li-text"><span class="li-title">Personal info</span></span><span class="ms li-trail">chevron_right</span></button></li>
          <li><button class="li" type="button" (click)="nav.go('/profile/password')"><span class="ms">lock</span><span class="li-text"><span class="li-title">Password</span></span><span class="ms li-trail">chevron_right</span></button></li>
          <li><button class="li" type="button" (click)="nav.go('/profile/team')"><span class="ms">group</span><span class="li-text"><span class="li-title">My team</span><span class="li-sub">{{ teamN() }}</span></span><span class="ms li-trail">chevron_right</span></button></li>
        </ul>

        <h2 class="section-title">Settings</h2>
        <ul class="list card">
          <li class="setting"><span class="ms ic-muted">notifications</span><span class="li-text"><span class="li-title">Notifications</span><span class="li-sub">Changes and team notes.</span></span><app-switch label="Notifications" [on]="s().notifications" (changed)="set({ notifications: $event })" /></li>
          <li><button class="li" type="button" (click)="nav.go('/profile/language')"><span class="ms">language</span><span class="li-text"><span class="li-title">Language</span><span class="li-sub">{{ u().lang }}</span></span><span class="ms li-trail">chevron_right</span></button></li>
        </ul>

        <h2 class="section-title">Accessibility</h2>
        <ul class="list card">
          <li class="setting col">
            <span class="li-title">Text size</span>
            <app-seg label="Text size" [options]="['Default', 'Large', 'Larger']" [value]="s().textSize" (valueChange)="set({ textSize: $any($event) })" />
            <p class="preview">Preview: Blockings may be out of date.</p>
          </li>
          <li class="setting"><span class="li-text"><span class="li-title">High contrast</span><span class="li-sub">Stronger borders and text.</span></span><app-switch label="High contrast" [on]="s().highContrast" (changed)="set({ highContrast: $event })" /></li>
          <li class="setting"><span class="li-text"><span class="li-title">Reduce motion</span><span class="li-sub">Fewer animations and transitions.</span></span><app-switch label="Reduce motion" [on]="s().reduceMotion" (changed)="set({ reduceMotion: $event })" /></li>
        </ul>

        <h2 class="section-title">Help and info</h2>
        <ul class="list card">
          <li><button class="li" type="button" (click)="nav.go('/help')"><span class="ms">help</span><span class="li-text"><span class="li-title">Help</span></span><span class="ms li-trail">chevron_right</span></button></li>
          <li><button class="li" type="button" (click)="nav.go('/help/feedback')"><span class="ms">mail</span><span class="li-text"><span class="li-title">Send feedback</span></span><span class="ms li-trail">chevron_right</span></button></li>
          <li><button class="li" type="button" (click)="nav.go('/profile/privacy')"><span class="ms">shield</span><span class="li-text"><span class="li-title">Privacy and terms</span></span><span class="ms li-trail">chevron_right</span></button></li>
        </ul>
        <button class="li card" type="button" style="margin-top:8px;color:var(--gdd-error)" (click)="store.logout(); nav.root('/login')"><span class="ms" style="color:var(--gdd-error)">logout</span><span class="li-title" style="color:var(--gdd-error)">Log out</span></button>
        <p class="version">My GDD · version 0.1</p>
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
  protected count = computed(() => { const n = this.store.data().gdds.length; return n + (n === 1 ? ' project' : ' projects'); });
  protected teamN = computed(() => { const n = this.store.data().team.members.length; return n + (n === 1 ? ' person' : ' people'); });
  set(p: Partial<Settings>): void { this.store.settings.update((s) => ({ ...s, ...p })); }
}

@Component({
  selector: 'app-edit-profile',
  imports: [IonHeader, IonContent, TopBarComponent, SegComponent],
  template: `
    <ion-header><app-top-bar title="Edit profile" back="/profile" [profile]="false" /></ion-header>
    <ion-content>
      <form class="page" (submit)="$event.preventDefault(); save()" novalidate>
        <div class="profile-head">
          <div class="pic"><span class="ms">{{ avatar() }}</span></div>
          <button class="btn btn-text" type="button" (click)="store.sheet.set({ k: 'avatar', av: store.data().user.av })">Change photo</button>
        </div>
        <h2 class="section-title">About you</h2>
        <div class="field" [class.error]="errName()">
          <div class="field-box"><label for="ep-name">Name</label><input id="ep-name" autocomplete="name" [value]="name()" (input)="name.set($any($event.target).value); errName.set(false)" /></div>
          @if (errName()) { <span class="field-error">Enter your name.</span> }
        </div>
        <div class="field">
          <div class="field-box"><label for="ep-user">User name</label><input id="ep-user" [value]="user()" (input)="user.set($any($event.target).value)" /></div>
          <span class="field-help">Your team sees it in notes and in My team.</span>
        </div>
        <div class="field" [class.error]="errEmail()">
          <div class="field-box"><label for="ep-email">Email</label><input id="ep-email" type="email" autocomplete="email" [value]="email()" (input)="email.set($any($event.target).value); errEmail.set(false)" /></div>
          @if (errEmail()) { <span class="field-error">Enter an email address, for example name&#64;example.com.</span> } @else { <span class="field-help">If you change it, we’ll send a link to confirm the new email.</span> }
        </div>
        <h2 class="section-title">App appearance</h2>
        <span class="t-label-large">Theme</span>
        <app-seg label="Theme" [options]="['Light', 'Dark', 'System']" [(value)]="theme" />
        <span class="t-label-large">Accent color</span>
        <div class="accents" role="radiogroup" aria-label="Accent color">
          @for (a of accents; track a[0]) {
            <button type="button" role="radio" [class.on]="accent() === a[0]" [attr.aria-checked]="accent() === a[0]" [attr.aria-label]="a[0]" [style.background]="a[1]" (click)="accent.set(a[0])">
              @if (accent() === a[0]) { <span class="ms s20">check</span> }
            </button>
          }
        </div>
        <p class="field-help" style="padding:0">More accent colors arrive with the next color palette.</p>
        <button class="btn btn-filled m block" type="submit">Save</button>
      </form>
    </ion-content>
  `,
})
export class EditProfilePage {
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
  imports: [IonHeader, IonContent, TopBarComponent],
  template: `
    <ion-header><app-top-bar title="Personal info" back="/profile" [profile]="false" /></ion-header>
    <ion-content>
      <div class="page">
        <p class="intro">Only you can see this information. Name, user name and email change in Edit profile.</p>
        <h2 class="section-title">Your details</h2>
        <ul class="list card">
          @for (r of rows(); track r.k) {
            <li><button class="li" type="button" (click)="r.run()"><span class="li-text"><span class="li-sub">{{ r.k }}</span><span class="li-title">{{ r.v }}</span></span><span class="ms li-trail">chevron_right</span></button></li>
          }
        </ul>
        <p class="crumb">Member since October 2026</p>
        <h2 class="section-title">Your data</h2>
        <ul class="list card">
          <li><button class="li" type="button" (click)="store.toast('We’ll email you a file with your data at ' + store.data().user.email + '.')"><span class="ms">download</span><span class="li-title">Download my data</span></button></li>
          <li><button class="li" type="button" style="color:var(--gdd-error)" (click)="store.dialog.set({ k: 'del', what: 'account' })"><span class="ms" style="color:var(--gdd-error)">delete</span><span class="li-title" style="color:var(--gdd-error)">Delete account</span></button></li>
        </ul>
      </div>
    </ion-content>
  `,
})
export class PersonalPage {
  protected store = inject(StoreService);
  private nav = inject(NavService);
  protected rows = computed(() => {
    const u = this.store.data().user;
    const edit = () => this.nav.go('/profile/edit');
    const field = (key: 'phone' | 'country' | 'tz', label: string) => () => this.store.dialog.set({ k: 'rename', what: 'field', key, label, val: u[key], err: false });
    return [
      { k: 'Name', v: u.name, run: edit },
      { k: 'User name', v: '@' + u.user, run: edit },
      { k: 'Email', v: u.email, run: edit },
      { k: 'Phone', v: u.phone || 'Not added', run: field('phone', 'Phone') },
      { k: 'Country or region', v: u.country || 'Not added', run: field('country', 'Country or region') },
      { k: 'Time zone', v: u.tz || 'Not added', run: field('tz', 'Time zone') },
    ];
  });
}

@Component({
  selector: 'app-password',
  imports: [IonHeader, IonContent, TopBarComponent, SwitchComponent],
  template: `
    <ion-header><app-top-bar title="Password" back="/profile" [profile]="false" /></ion-header>
    <ion-content>
      <form class="page" (submit)="$event.preventDefault(); update()" novalidate>
        <h2 class="section-title">Change password</h2>
        @for (f of fields; track f.key) {
          <div class="field" [class.error]="perr() === f.key">
            <div class="field-box">
              <label [for]="'pw-' + f.key">{{ f.label }}</label>
              <input [id]="'pw-' + f.key" [type]="show() ? 'text' : 'password'" [autocomplete]="f.key === 'cur' ? 'current-password' : 'new-password'" [value]="vals()[f.key]" (input)="setVal(f.key, $any($event.target).value)" />
              <button class="icon-btn trail" type="button" [attr.aria-label]="show() ? 'Hide passwords' : 'Show passwords'" (click)="show.set(!show())"><span class="ms">{{ show() ? 'visibility_off' : 'visibility' }}</span></button>
            </div>
            @if (perr() === f.key) { <span class="field-error">{{ f.key === 'cur' ? curMsg() : f.err }}</span> } @else if (f.key === 'nw') { <span class="field-help">At least 8 characters.</span> }
          </div>
        }
        <button class="btn btn-filled m block" type="submit">Update password</button>
        <button class="btn btn-text" type="button" style="align-self:center" (click)="store.toast('We sent a reset link to ' + store.data().user.email + '.')">Forgot your current password?</button>
        <h2 class="section-title">Security</h2>
        <ul class="list card">
          <li class="setting"><span class="li-text"><span class="li-title">Two-step verification</span><span class="li-sub">Ask for a code when you log in on a new device.</span></span><app-switch label="Two-step verification" [(on)]="tfa" /></li>
          <li><button class="li" type="button" (click)="store.toast('You’re logged out of all other devices.')"><span class="ms">logout</span><span class="li-title">Log out of other devices</span></button></li>
        </ul>
      </form>
    </ion-content>
  `,
})
export class PasswordPage {
  protected store = inject(StoreService);
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
    const ok = () => { this.vals.set({ cur: '', nw: '', cf: '' }); this.store.toast('Password updated. Use it the next time you log in.'); };
    if (!this.store.live()) { ok(); return; }
    this.api.changePassword(cur, nw).then(ok, (e: unknown) => {
      const m = apiMessage(e);
      if (m === 'The current password is incorrect.') { this.curMsg.set(m); this.perr.set('cur'); } else this.store.toast(m, { kind: 'err' });
    });
  }
}

@Component({
  selector: 'app-team',
  imports: [IonHeader, IonContent, TopBarComponent],
  template: `
    <ion-header><app-top-bar title="My team" back="/profile" [profile]="false" /></ion-header>
    <ion-content>
      <div class="page with-fab">
        <p class="intro">People who can see your GDDs and get your notes.</p>
        <h2 class="section-title">Members · {{ team().members.length }}</h2>
        <ul class="list card">
          @for (m of team().members; track m.id) {
            <li class="setting" style="min-height:72px" [class.slide-out]="store.dying() === m.id">
              <span class="member-ini" [class.you]="m.you">{{ m.name.charAt(0).toUpperCase() }}</span>
              <span class="li-text"><span class="li-title">{{ m.you ? m.name + ' (you)' : m.name }}</span><span class="li-sub">{{ m.dept }} · {{ m.role }}</span></span>
              @if (!m.you) { <button class="btn btn-outlined" type="button" (click)="store.sheet.set({ k: 'manage', id: m.id, role: m.role })">Manage</button> }
            </li>
          }
        </ul>
        @if (team().invites.length) {
          <h2 class="section-title">Pending invitations · {{ team().invites.length }}</h2>
          <ul class="list card">
            @for (v of team().invites; track v.id) {
              <li class="setting">
                <span class="ms ic-muted">send</span>
                <span class="li-text"><span class="li-title">{{ v.email }}</span><span class="li-sub">{{ v.role }} · Invitation sent</span></span>
                <button class="icon-btn" type="button" [attr.aria-label]="'Resend invitation to ' + v.email" (click)="store.toast('Invitation sent again to ' + v.email)"><span class="ms">refresh</span></button>
                <button class="icon-btn" type="button" [attr.aria-label]="'Cancel invitation to ' + v.email" (click)="store.cancelInvite(v.id)"><span class="ms">close</span></button>
              </li>
            }
          </ul>
        }
        <p class="crumb">Editor: can write blocks and send notes. Viewer: can read the GDD and send notes.</p>
      </div>
      <button class="fab" slot="fixed" type="button" (click)="store.sheet.set({ k: 'invite', email: '', role: 'Editor', err: false })"><span class="ms">add</span>Invite member</button>
    </ion-content>
  `,
})
export class TeamPage {
  protected store = inject(StoreService);
  protected team = computed(() => this.store.data().team);
}

@Component({
  selector: 'app-language',
  imports: [IonHeader, IonContent, TopBarComponent],
  template: `
    <ion-header><app-top-bar title="Language" back="/profile" [profile]="false" /></ion-header>
    <ion-content>
      <div class="page">
        <p class="intro">Choose the language of the app. The text of your GDDs doesn’t change.</p>
        <div class="list card" role="radiogroup" aria-label="Language">
          @for (l of langs; track l[0]) {
            <button class="li" type="button" role="radio" [attr.aria-checked]="store.data().user.lang === l[0]" [attr.lang]="null" (click)="store.setLang(l[0])">
              <span class="radio" [class.on]="store.data().user.lang === l[0]"></span>
              <span class="li-text"><span class="li-title">{{ l[0] }}</span><span class="li-sub">{{ l[1] }}</span></span>
            </button>
          }
        </div>
      </div>
    </ion-content>
  `,
})
export class LanguagePage {
  protected store = inject(StoreService);
  protected langs = [['English', 'English'], ['Español', 'Spanish'], ['Català', 'Catalan'], ['Deutsch', 'German'], ['Français', 'French'], ['Italiano', 'Italian'], ['Português', 'Portuguese'], ['日本語', 'Japanese'], ['한국어', 'Korean'], ['中文 (简体)', 'Chinese, simplified']];
}

@Component({
  selector: 'app-privacy',
  imports: [IonHeader, IonContent, TopBarComponent],
  template: `
    <ion-header><app-top-bar title="Privacy and terms" back="/profile" [profile]="false" /></ion-header>
    <ion-content>
      <div class="page prose">
        <p>A short summary. Last updated: October 2026.</p>
        <h3>What we save</h3>
        <p>Your GDDs, the notes you send and receive, and the basic details of your account.</p>
        <h3>Who can see your GDDs</h3>
        <p>Only you and the people in My team. Viewers can read; editors can also write.</p>
        <h3>Your choices</h3>
        <p>You can download your data or delete your account in Personal info at any time.</p>
        <h3>Terms of use</h3>
        <p>You own what you write in My GDD. Don’t share content that isn’t yours.</p>
      </div>
    </ion-content>
  `,
})
export class PrivacyPage {}
