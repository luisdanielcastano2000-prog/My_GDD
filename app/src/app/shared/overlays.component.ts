import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { AVATAR_ICON, AVATAR_NAME, type AvatarKey, type Dialog, type Grant, type Member, type Sheet } from '../data/models';
import { StoreService } from '../data/store.service';
import { t, tn, TPipe } from '../i18n/i18n';

import { GrantsComponent } from './grants.component';
import { NavService } from './nav.service';
import { SegComponent } from './ui';

type ActSheet = Extract<Sheet, { k: 'act' }>;
type RenameDlg = Extract<Dialog, { k: 'rename' }>;
type DelDlg = Extract<Dialog, { k: 'del' }>;

/**
 * Capas que se abren encima de cualquier pantalla: hojas de acciones (bottom sheets),
 * diálogos de renombrar y de confirmar, y el snackbar. Su estado vive en el StoreService.
 */
@Component({
  selector: 'app-overlays',
  imports: [TPipe, SegComponent, GrantsComponent],
  template: `
    @if (store.sheet() || store.dialog()) {
      <!-- tocar fuera (en el scrim) o pulsar Esc cierra la capa -->
      <div class="scrim" tabindex="-1" [class.center]="!!store.dialog()" [class.closing]="closing()" (click)="$event.target === $event.currentTarget && close()" (keydown.escape)="close()">
        <!-- ===== diálogos ===== -->
        @if (rename(); as d) {
          <div class="dialog" role="dialog" aria-modal="true" [attr.aria-label]="renameTitle(d)">
            <h2>{{ renameTitle(d) }}</h2>
            <div class="field" [class.error]="d.err">
              <div class="field-box">
                <label for="dlg-name">{{ renameLabel(d) }}</label>
                <input id="dlg-name" [value]="d.val" (input)="store.dialog.set({ ...d, val: $any($event.target).value, err: false })" (keyup.enter)="store.saveRename(d)" />
              </div>
              @if (d.err) { <span class="field-error">{{ 'Enter a name.' | t }}</span> }
            </div>
            <div class="btn-row">
              <button class="btn btn-text" type="button" (click)="close()">{{ 'Cancel' | t }}</button>
              <button class="btn btn-text" type="button" (click)="store.saveRename(d)">{{ 'Save' | t }}</button>
            </div>
          </div>
        }
        @if (del(); as d) {
          <div class="dialog" role="alertdialog" aria-modal="true" [attr.aria-label]="delText(d).title">
            <h2>{{ delText(d).title }}</h2>
            <p>{{ delText(d).text }}</p>
            <div class="btn-row">
              <button class="btn btn-text" type="button" (click)="close()">{{ delText(d).cancel }}</button>
              <button class="btn btn-text danger" type="button" (click)="confirmDelete(d)">{{ delText(d).ok }}</button>
            </div>
          </div>
        }

        <!-- ===== hojas inferiores ===== -->
        @if (act(); as sh) {
          <div class="sheet" role="dialog" aria-modal="true" [attr.aria-label]="actInfo(sh).name">
            <div class="handle"></div>
            <h2>{{ actInfo(sh).name }}</h2>
            @if (sharedOf(sh); as sg) {
              <!-- GDD de otra persona: no se renombra, mueve ni borra; se puede salir de su equipo -->
              <p class="sheet-meta">{{ 'Shared by {p0} · {p1}' | t: { p0: sg.name, p1: sg.role } }}</p>
              <ul class="list plain acts">
                <li><button class="li danger" type="button" (click)="leave(sg)"><span class="ms">logout</span><span class="li-text"><span class="li-title">{{ 'Leave {p0}’s team' | t: { p0: sg.name } }}</span></span></button></li>
              </ul>
            } @else {
            <ul class="list plain acts">
              <li><button class="li" type="button" (click)="store.openRename(sh.what, sh.id, sh.g, sh.dp)"><span class="ms">edit</span><span class="li-text"><span class="li-title">{{ 'Rename' | t }}</span></span></button></li>
              @if (sh.what === 'gdd') {
                <li><button class="li" type="button" (click)="store.sheet.set(null); store.toast(tr('Cover images arrive in a later version'))"><span class="ms">add_photo_alternate</span><span class="li-text"><span class="li-title">{{ 'Add cover image' | t }}</span></span></button></li>
              }
              @if (sh.what !== 'block') {
                <li><button class="li" type="button" [disabled]="actInfo(sh).idx <= 0" (click)="store.move(sh, -1)"><span class="ms">{{ sh.what === 'gdd' ? 'arrow_back' : 'arrow_upward' }}</span><span class="li-text"><span class="li-title">{{ (sh.what === 'gdd' ? 'Move left' : 'Move up') | t }}</span></span></button></li>
                <li><button class="li" type="button" [disabled]="actInfo(sh).idx >= actInfo(sh).len - 1" (click)="store.move(sh, 1)"><span class="ms">{{ sh.what === 'gdd' ? 'arrow_forward' : 'arrow_downward' }}</span><span class="li-text"><span class="li-title">{{ (sh.what === 'gdd' ? 'Move right' : 'Move down') | t }}</span></span></button></li>
              }
              <li><button class="li danger" type="button" (click)="store.askDelete(sh)"><span class="ms">delete</span><span class="li-text"><span class="li-title">{{ 'Delete' | t }}</span></span></button></li>
            </ul>
            }
          </div>
        }
        @if (noteSheet(); as sh) {
          <div class="sheet" role="dialog" aria-modal="true" [attr.aria-label]="sh.title">
            <div class="handle"></div>
            <h2>{{ sh.title }}</h2>
            <ul class="list plain acts">
              @if (sh.kind === 'change') {
                <li><button class="li" type="button" (click)="openNote(sh.id)"><span class="ms">check</span><span class="li-text"><span class="li-title">{{ 'Review' | t }}</span></span></button></li>
              }
              @if (sh.kind === 'team') {
                <li><button class="li" type="button" (click)="openNote(sh.id)"><span class="ms">open_in_new</span><span class="li-text"><span class="li-title">{{ 'Open block' | t }}</span></span></button></li>
              }
              <li><button class="li danger" type="button" (click)="store.deleteNote(sh.id, sh.kind === 'sent')"><span class="ms">delete</span><span class="li-text"><span class="li-title">{{ 'Delete note' | t }}</span></span></button></li>
            </ul>
          </div>
        }
        @if (avatarSheet(); as sh) {
          <div class="sheet" role="dialog" aria-modal="true" [attr.aria-label]="'Profile photo' | t">
            <div class="handle"></div>
            <h2>{{ 'Profile photo' | t }}</h2>
            <p class="sheet-meta">{{ 'Choose an avatar. Photos from your device arrive in a later version.' | t }}</p>
            <div class="sheet-body">
              <div class="avatars" role="radiogroup" [attr.aria-label]="'Avatar' | t">
                @for (k of avatarKeys; track k) {
                  <button type="button" role="radio" [class.on]="sh.av === k" [attr.aria-checked]="sh.av === k" (click)="store.sheet.set({ k: 'avatar', av: k })">
                    <span class="ms" [class.fill]="sh.av === k">{{ avatarIcon[k] }}</span>{{ avatarName[k] }}
                  </button>
                }
              </div>
              <div class="btn-row">
                <button class="btn btn-text" type="button" (click)="close()">{{ 'Cancel' | t }}</button>
                <button class="btn btn-filled" type="button" (click)="store.sheet.set(null); store.setAvatar(sh.av)">{{ 'Save' | t }}</button>
              </div>
            </div>
          </div>
        }
        @if (manage(); as sh) {
          <div class="sheet" role="dialog" aria-modal="true" [attr.aria-label]="'Manage {p0}' | t: { p0: member(sh.id)?.name }">
            <div class="handle"></div>
            <h2>{{ 'Manage {p0}' | t: { p0: member(sh.id)?.name } }}</h2>
            <p class="sheet-meta">{{ member(sh.id)?.email }} · {{ member(sh.id)?.dept }}</p>
            <div class="sheet-body">
              <app-grants [gdds]="store.ownGdds()" [grants]="sh.grants ?? memberGrants(sh.id)" (grantsChange)="store.sheet.set({ ...sh, grants: $event })" />
              <div class="btn-row">
                <button class="btn btn-text" type="button" (click)="close()">{{ 'Cancel' | t }}</button>
                <button class="btn btn-filled" type="button" (click)="store.saveAccess(sh.id, sh.grants ?? memberGrants(sh.id))">{{ 'Save' | t }}</button>
              </div>
              <button class="btn btn-outlined danger block" type="button" (click)="store.sheet.set(null); store.dialog.set({ k: 'del', what: 'member', id: sh.id })">{{ 'Remove from team' | t }}</button>
            </div>
          </div>
        }
        @if (invite(); as sh) {
          <div class="sheet" role="dialog" aria-modal="true" [attr.aria-label]="'Invite a member' | t">
            <div class="handle"></div>
            <h2>{{ 'Invite a member' | t }}</h2>
            <p class="sheet-meta">{{ 'When they log in with this email, they’ll see your invitation in Notes. Once they accept, they can see the projects you choose.' | t }}</p>
            <div class="sheet-body">
              <div class="field" [class.error]="sh.err">
                <div class="field-box">
                  <label for="inv-email">{{ 'Email' | t }}</label>
                  <input id="inv-email" type="email" autocomplete="off" [value]="sh.email" (input)="store.sheet.set({ ...sh, email: $any($event.target).value, err: false })" />
                </div>
                @if (sh.err) { <span class="field-error">Enter an email address, for example name@example.com.</span> }
              </div>
              <app-grants [gdds]="store.ownGdds()" [grants]="sh.grants ?? store.defaultGrants(sh.role)" (grantsChange)="store.sheet.set({ ...sh, grants: $event })" />
              <div class="btn-row">
                <button class="btn btn-text" type="button" (click)="close()">{{ 'Cancel' | t }}</button>
                <button class="btn btn-filled" type="button" [class.ok]="sh.busy === 'ok'" [attr.aria-busy]="!!sh.busy" (click)="sendInvite(sh)">
                  @switch (sh.busy) {
                    @case ('load') { <span class="spin"></span>{{ 'Sending the invitation' | t }} }
                    @case ('ok') { <span class="ms s20">check</span>{{ 'Invitation sent' | t }} }
                    @default { {{ 'Send invite' | t }} }
                  }
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    }

    @if (store.snack(); as s) {
      <div class="snackbar" [class.ok]="s.kind === 'ok'" [class.err]="s.kind === 'err'" [style.--sn-b]="snackBottom()" role="status" aria-live="polite">
        @if (s.kind === 'ok') { <span class="lbl ok"><span class="ms s16">check</span>{{ 'OK' | t }}</span> }
        @if (s.kind === 'err') { <span class="lbl er">{{ '× Error' | t }}</span> }
        <span class="msg">{{ s.msg }}</span>
        @if (s.undo) { <button class="btn btn-text act" type="button" (click)="store.undo()">{{ 'Undo' | t }}</button> }
        @if (s.action; as a) { <button class="btn btn-text act" type="button" (click)="store.snack.set(null); a.run()">{{ a.label }}</button> }
      </div>
    }
  `,
})
export class OverlaysComponent {
  protected tr = t;
  protected store = inject(StoreService);
  private nav = inject(NavService);
  private url = signal(location.pathname);
  protected closing = signal(false);
  protected avatarKeys = Object.keys(AVATAR_ICON) as AvatarKey[];
  protected avatarIcon = AVATAR_ICON;
  protected avatarName = AVATAR_NAME;

  protected rename = computed(() => { const d = this.store.dialog(); return d?.k === 'rename' ? d : null; });
  protected del = computed(() => { const d = this.store.dialog(); return d?.k === 'del' ? d : null; });
  private sh = computed(() => (this.store.dialog() ? null : this.store.sheet()));
  protected act = computed(() => { const s = this.sh(); return s?.k === 'act' ? s : null; });
  protected noteSheet = computed(() => { const s = this.sh(); return s?.k === 'note' ? s : null; });
  protected avatarSheet = computed(() => { const s = this.sh(); return s?.k === 'avatar' ? s : null; });
  protected manage = computed(() => { const s = this.sh(); return s?.k === 'manage' ? s : null; });
  protected invite = computed(() => { const s = this.sh(); return s?.k === 'invite' ? s : null; });

  /** El snackbar sube por encima del FAB y de la barra de navegación. */
  protected snackBottom = computed(() => {
    const u = this.url();
    if (/\/block\//.test(u)) return '96px';
    if (/^\/(login|signup|forgot)/.test(u)) return '16px';
    if (u === '/home' || /^\/gdd\/[^/]+$/.test(u) || u === '/notes' || u === '/profile/team') return 'calc(80px * var(--gdd-ts) + 88px)';
    return 'calc(80px * var(--gdd-ts) + 12px)';
  });

  constructor() {
    inject(Router).events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e) => {
      this.url.set((e as NavigationEnd).urlAfterRedirects.split('?')[0]);
      this.store.closeLayers();
    });
  }

  close(): void {
    if (this.closing()) return;
    if (this.store.settings().reduceMotion) { this.store.closeLayers(); return; }
    this.closing.set(true);
    setTimeout(() => { this.store.closeLayers(); this.closing.set(false); }, 220 * (this.store.settings().slowMotion ? 4 : 1));
  }

  renameTitle(d: RenameDlg): string {
    return t(d.what === 'gdd' ? 'Rename project' : d.what === 'dept' ? 'Rename department' : d.what === 'block' ? 'Rename block' : d.label ?? '');
  }
  renameLabel(d: RenameDlg): string {
    return t(d.what === 'gdd' ? 'Project name' : d.what === 'dept' ? 'Department name' : d.what === 'block' ? 'Block name' : d.label ?? '');
  }
  delText(d: DelDlg): { title: string; text: string; ok: string; cancel: string } {
    const data = this.store.data();
    if (d.what === 'gdd') {
      const x = data.gdds.find((g) => g.id === d.id);
      const nd = x?.depts.length ?? 0;
      const nb = x?.depts.reduce((a, y) => a + y.blocks.length, 0) ?? 0;
      return { title: t('Delete {name}?', { name: x?.name ?? '' }), text: t('Its {depts} and {blocks} will be deleted. You can’t undo this.', { depts: tn(nd, '{n} department', '{n} departments'), blocks: tn(nb, '{n} block', '{n} blocks') }), ok: t('Delete'), cancel: t('Cancel') };
    }
    if (d.what === 'member') {
      const m = data.team.members.find((x) => x.id === d.id);
      return { title: t('Remove {name} from your team?', { name: m?.name ?? '' }), text: t('They won’t see your GDDs or get your notes anymore.'), ok: t('Remove'), cancel: t('Keep') };
    }
    return { title: t('Delete your account?'), text: t('Your GDDs, notes and team will be deleted. You can’t undo this.'), ok: t('Delete'), cancel: t('Cancel') };
  }
  confirmDelete(d: DelDlg): void {
    if (this.store.confirmDelete(d) === 'account') this.nav.root('/login');
  }
  actInfo(sh: ActSheet): { idx: number; len: number; name: string } {
    return this.store.actIndex(sh);
  }
  /** Acceso actual de una persona (sin grants = todos tus GDDs con su rol, como antes). */
  memberGrants(id: string): Grant[] {
    const m = this.member(id);
    return m?.grants ?? this.store.defaultGrants(m?.role === 'Viewer' ? 'Viewer' : 'Editor');
  }
  member(id: string): Member | undefined {
    return this.store.data().team.members.find((m) => m.id === id);
  }
  /** El GDD de otra persona de una hoja de acciones (para salir de su equipo). */
  sharedOf(sh: ActSheet): { owner: string; name: string; role: 'Editor' | 'Viewer' } | null {
    return sh.what === 'gdd' ? (this.store.gdd(sh.id)?.share ?? null) : null;
  }
  leave(team: { owner: string; name: string; role: 'Editor' | 'Viewer' }): void {
    this.store.sheet.set(null);
    void this.store.leaveTeam(team);
  }
  openNote(id: string): void {
    const n = this.store.data().notes.find((x) => x.id === id);
    this.store.sheet.set(null);
    if (!n) return;
    if (!this.store.gdd(n.g)) { this.store.toast(t('This note isn’t linked to a GDD you can open.')); return; }
    if (n.kind === 'change') { this.nav.go('/gdd/' + n.g + '/review/' + n.id); return; }
    const g = this.store.gdd(n.g);
    const dp = this.store.dept(g, n.dp);
    this.nav.go(dp ? '/gdd/' + n.g + '/dept/' + dp.id : '/gdd/' + n.g);
  }
  sendInvite(sh: Extract<Sheet, { k: 'invite' }>): void {
    const em = sh.email.trim();
    if (em.indexOf('@') < 1) { this.store.sheet.set({ ...sh, err: true }); return; }
    if (sh.busy) return;
    if (this.store.needVerify('invite people')) return;
    const team = this.store.data().team, low = em.toLowerCase();
    if (low === this.store.data().user.email.toLowerCase()) { this.store.toast(t('That’s your own email.')); return; }
    if (team.members.some((m) => m.email.toLowerCase() === low)) { this.store.toast(t('{email} is already in your team.', { email: em })); return; }
    if (team.invites.some((v) => v.email.toLowerCase() === low)) { this.store.toast(t('{email} already has an invitation.', { email: em })); return; }
    const grants = sh.grants ?? this.store.defaultGrants(sh.role);
    if (!grants.length && this.store.ownGdds().length) { this.store.toast(t('Choose at least one project.')); return; }
    const k = this.store.settings().slowMotion ? 4 : 1;
    this.store.sheet.set({ ...sh, busy: 'load' });
    setTimeout(() => {
      this.store.sheet.set({ ...sh, busy: 'ok' });
      setTimeout(() => { this.store.sheet.set(null); this.store.invite(em, grants); }, 650 * k);
    }, 400 * k);
  }
}
