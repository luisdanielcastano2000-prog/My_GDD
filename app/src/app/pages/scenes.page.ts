// Selector de pantallas (solo para desarrollo y revisión de diseño): abre cada escena del lienzo
// «My GDD · Fase 5» en el mismo estado que su marco F5-*, en tema claro u oscuro y con el movimiento elegido.
import { Component, inject, signal } from '@angular/core';
import { IonContent, IonHeader } from '@ionic/angular';

import { mkSection, nid } from '../data/sample';
import { StoreService } from '../data/store.service';
import { NavService } from '../shared/nav.service';
import { SegComponent, TopBarComponent } from '../shared/ui';

interface SceneGroup {
  name: string;
  scenes: string[];
}

export const SCENE_GROUPS: SceneGroup[] = [
  { name: 'Acceso', scenes: ['login', 'login-error', 'signup', 'signup-error', 'forgot', 'forgot-sent'] },
  { name: 'Home', scenes: ['home', 'home-error', 'home-menu', 'home-rename', 'home-delete', 'newgdd'] },
  { name: 'Departamentos', scenes: ['depts', 'depts-empty', 'depts-search', 'depts-new-dept'] },
  { name: 'Departamento', scenes: ['dept', 'dept-empty', 'dept-new-block', 'dept-block-menu', 'dept-rename'] },
  {
    name: 'Editor',
    scenes: [
      'editor-splines',
      'editor-saved',
      'editor-save-error',
      'editor-blockings',
      'editor-blockings-done',
      'editor-gameplay',
    ],
  },
  { name: 'Revisión', scenes: ['review', 'review-reviewed', 'review-done', 'outdated'] },
  {
    name: 'Notas',
    scenes: [
      'notes',
      'notes-folded',
      'notes-menu',
      'sent',
      'sent-empty',
      'sent-confirm',
      'newnote',
      'newnote-empty',
      'newnote-send-error',
    ],
  },
  { name: 'Ayuda', scenes: ['help', 'guide', 'glossary', 'feedback'] },
  {
    name: 'Perfil',
    scenes: ['profile', 'profile-photo', 'edit-profile', 'personal', 'password', 'language', 'privacy'],
  },
  { name: 'Equipo', scenes: ['team', 'team-manage', 'team-remove', 'team-invite', 'team-invite-error'] },
];

@Component({
  selector: 'app-scenes',
  imports: [IonHeader, IonContent, TopBarComponent, SegComponent],
  template: `
    <ion-header><app-top-bar title="Pantallas del diseño" sub="56 escenas · Fase 5" [profile]="false" /></ion-header>
    <ion-content>
      <div class="page scenes" style="padding-bottom:32px">
        <p class="intro">
          Abre cada pantalla en el mismo estado que su marco del lienzo. Desde ahí, la app funciona con normalidad (los
          datos vuelven a los de ejemplo).
        </p>
        <span class="t-label-large">Tema</span>
        <app-seg label="Tema" [options]="['Claro', 'Oscuro']" [(value)]="theme" />
        <span class="t-label-large">Movimiento</span>
        <app-seg label="Movimiento" [options]="['Normal', 'Lento ×4', 'Reducido']" [(value)]="motion" />
        <button class="btn btn-filled m block" type="button" (click)="open('login')">
          <span class="ms">play_arrow</span>Prototipo completo (desde Log in)
        </button>
        @for (g of groups; track g.name) {
          <h2 class="section-title">{{ g.name }}</h2>
          <div class="grp">
            @for (s of g.scenes; track s) {
              <button type="button" (click)="open(s)">{{ s }}</button>
            }
          </div>
        }
      </div>
    </ion-content>
  `,
})
export class ScenesPage {
  private store = inject(StoreService);
  private nav = inject(NavService);
  protected groups = SCENE_GROUPS;
  protected theme = signal(this.store.dark() ? 'Oscuro' : 'Claro');
  protected motion = signal(
    this.store.settings().slowMotion ? 'Lento ×4' : this.store.settings().reduceMotion ? 'Reducido' : 'Normal',
  );

  open(scene: string): void {
    const s = this.store;
    const empty = scene === 'notes-empty';
    s.reset(empty);
    s.setTheme(this.theme() === 'Oscuro' ? 'Dark' : 'Light');
    s.settings.update((x) => ({
      ...x,
      slowMotion: this.motion() === 'Lento ×4',
      reduceMotion: this.motion() === 'Reducido',
    }));
    const { hist, after } = buildScene(s, scene);
    void this.nav.openWithHistory(hist).then(() => setTimeout(() => after?.(), 30));
  }
}

/** Prepara los datos y devuelve el historial de pantallas de una escena (equivale a _sceneState del prototipo). */
export function buildScene(s: StoreService, sc: string): { hist: string[]; after?: () => void } {
  const d = s.data();
  const ht = d.gdds[0];
  const dep = (n: string) => ht.depts.find((x) => x.name === n)!;
  const blk = (dn: string, bn: string) => dep(dn).blocks.find((x) => x.name === bn)!;
  const A = dep('Animation');
  const GD = dep('Game design');
  const bl = blk('Animation', 'Blockings');
  const spl = blk('Animation', 'Splines');
  const gp = blk('Game design', 'Gameplay');
  const ch = d.notes.find((n) => n.kind === 'change' && n.g === ht.id)!;
  const marc = d.team.members.find((x) => x.name === 'Marc')!;
  const home = '/home';
  const depts = '/gdd/' + ht.id;
  const anim = depts + '/dept/' + A.id;
  const ed = (dp: string, b: string) => depts + '/dept/' + dp + '/block/' + b;
  const notes = '/notes';
  const review = depts + '/review/' + ch.id;
  const change = (fn: (data: typeof d) => void) => {
    const c = structuredClone(s.data());
    fn(c);
    s.data.set(c);
  };

  switch (sc) {
    case 'login':
      return { hist: ['/login'] };
    case 'login-error':
      s.setDraft('login', { email: 'noa.example.com', pw: 'tides', bad: true });
      return { hist: ['/login'] };
    case 'signup':
      return { hist: ['/login', '/signup'] };
    case 'signup-error':
      s.setDraft('signup', {
        user: 'noa',
        email: 'noa@example.com',
        pw: 'divingdeep',
        ee: 'This email already has an account.',
      });
      return { hist: ['/login', '/signup'] };
    case 'forgot':
      s.setDraft('forgot', { email: 'noa@example.com' });
      return { hist: ['/login', '/forgot'] };
    case 'forgot-sent':
      return { hist: ['/login', '/forgot/sent?email=noa%40example.com'] };
    case 'home':
      return { hist: [home] };
    case 'home-error':
      s.loadErr.set(true);
      return { hist: [home] };
    case 'home-menu':
      return { hist: [home], after: () => s.sheet.set({ k: 'act', what: 'gdd', id: ht.id }) };
    case 'home-rename':
      return { hist: [home], after: () => s.openRename('gdd', ht.id) };
    case 'home-delete':
      return { hist: [home], after: () => s.dialog.set({ k: 'del', what: 'gdd', id: ht.id }) };
    case 'newgdd':
      s.setDraft('newgdd', { name: 'Neon Drift' });
      return { hist: [home, '/new-gdd'] };
    case 'depts':
      return { hist: [home, depts] };
    case 'depts-search':
      s.setDraft('depts', { q: 'an' });
      return { hist: [home, depts] };
    case 'depts-empty': {
      const nd = { id: nid(), name: 'Neon Drift', desc: 'Blank template', updated: 'Created today', depts: [] };
      change((c) => c.gdds.push(nd));
      return { hist: [home, '/gdd/' + nd.id] };
    }
    case 'depts-new-dept':
      return { hist: [home, depts], after: () => s.quickDept(ht.id) };
    case 'dept':
      return { hist: [home, depts, anim] };
    case 'dept-empty': {
      const cin = { id: nid(), name: 'Cinematics', blocks: [] };
      change((c) => c.gdds[0].depts.splice(4, 0, cin));
      return { hist: [home, depts, depts + '/dept/' + cin.id] };
    }
    case 'dept-new-block':
      return { hist: [home, depts, anim], after: () => s.quickBlock(ht.id, A.id) };
    case 'dept-block-menu':
      return {
        hist: [home, depts, anim],
        after: () => s.sheet.set({ k: 'act', what: 'block', id: bl.id, g: ht.id, dp: A.id }),
      };
    case 'dept-rename':
      return { hist: [home, depts, anim], after: () => s.openRename('block', bl.id, ht.id, A.id) };
    case 'editor-splines':
      return { hist: [home, depts, anim, ed(A.id, spl.id)] };
    case 'editor-saved':
    case 'editor-save-error': {
      change((c) => {
        const b = c.gdds[0].depts.find((x) => x.id === A.id)!.blocks.find((x) => x.id === spl.id)!;
        b.secs = [
          mkSection('Run cycle', 'Clean arcs on the arms. Ease in and out on frames 1 and 7.'),
          mkSection('Jump', 'Polish the take-off: overlap on the hair and the scarf.'),
        ];
        if (sc === 'editor-saved') b.status = 'Up to date';
      });
      const after =
        sc === 'editor-saved'
          ? () => s.toast('Splines saved · Up to date', { kind: 'ok' })
          : () =>
              s.toast('Your change couldn’t be saved.', {
                kind: 'err',
                action: { label: 'Retry', run: () => s.toast(s.save(spl.id), { kind: 'ok' }) },
              });
      return { hist: [home, depts, anim, ed(A.id, spl.id)], after };
    }
    case 'editor-blockings':
      return { hist: [home, depts, anim, ed(A.id, bl.id)] };
    case 'editor-blockings-done':
      s.markReviewed(bl.id);
      return {
        hist: [home, depts, anim, ed(A.id, bl.id)],
        after: () => s.toast('Blockings reviewed · Up to date', { kind: 'ok' }),
      };
    case 'editor-gameplay':
      return { hist: [home, notes, review, ed(GD.id, gp.id)] };
    case 'review':
      return { hist: [home, notes, review] };
    case 'review-reviewed':
      s.markReviewed(gp.id);
      return { hist: [home, notes, review], after: () => s.toast('Gameplay reviewed · Up to date', { kind: 'ok' }) };
    case 'review-done':
      (ch.aff ?? []).forEach((id) => s.markReviewed(id));
      return { hist: [home, notes, review] };
    case 'outdated':
      return { hist: [home, depts + '/outdated'] };
    case 'notes':
      return { hist: [home, notes] };
    case 'notes-empty':
      return { hist: [home, notes] };
    case 'notes-folded':
      s.notesCollapsed.set({ [d.gdds[1].id]: true });
      return { hist: [home, notes] };
    case 'notes-menu':
      return {
        hist: [home, notes],
        after: () => s.sheet.set({ k: 'note', kind: 'change', id: ch.id, title: ch.title }),
      };
    case 'sent':
      s.notesTab.set('s');
      return { hist: [home, notes] };
    case 'sent-empty':
      change((c) => (c.sent = []));
      s.notesTab.set('s');
      return { hist: [home, notes] };
    case 'sent-confirm':
      change((c) =>
        c.sent.push({
          id: nid(),
          g: ht.id,
          text: 'Jump timing changed. Check the Blockings.',
          to: 'Whole team, Animation',
          when: 'Just now',
          ts: Date.now(),
        }),
      );
      s.notesTab.set('s');
      return { hist: [home, notes], after: () => s.toast('Note sent', { kind: 'ok' }) };
    case 'newnote':
    case 'newnote-empty':
    case 'newnote-send-error':
      s.setDraft('newnote', {
        text: sc === 'newnote-empty' ? '' : 'Jump timing changed. Check the Blockings.',
        g: ht.id,
        dp: A.id,
        b: bl.id,
        err: sc === 'newnote-empty',
        sendError: sc === 'newnote-send-error',
      });
      return { hist: [home, notes, '/notes/new'] };
    case 'help':
      return { hist: [home, '/help'] };
    case 'guide':
      return { hist: [home, '/help', '/help/guide'] };
    case 'glossary':
      return { hist: [home, '/help', '/help/glossary'] };
    case 'feedback':
      return { hist: [home, '/help', '/help/feedback'] };
    case 'profile':
      return { hist: [home, '/profile'] };
    case 'profile-photo':
      return { hist: [home, '/profile'], after: () => s.sheet.set({ k: 'avatar', av: 'account' }) };
    case 'edit-profile':
      return { hist: [home, '/profile', '/profile/edit'] };
    case 'personal':
      return { hist: [home, '/profile', '/profile/personal'] };
    case 'password':
      return { hist: [home, '/profile', '/profile/password'] };
    case 'team':
      return { hist: [home, '/profile', '/profile/team'] };
    case 'team-manage':
      return {
        hist: [home, '/profile', '/profile/team'],
        after: () => s.sheet.set({ k: 'manage', id: marc.id, role: 'Editor' }),
      };
    case 'team-remove':
      return {
        hist: [home, '/profile', '/profile/team'],
        after: () => s.dialog.set({ k: 'del', what: 'member', id: marc.id }),
      };
    case 'team-invite':
      return {
        hist: [home, '/profile', '/profile/team'],
        after: () => s.sheet.set({ k: 'invite', email: '', role: 'Editor', err: false }),
      };
    case 'team-invite-error':
      return {
        hist: [home, '/profile', '/profile/team'],
        after: () => s.sheet.set({ k: 'invite', email: 'ivo.example.com', role: 'Editor', err: true }),
      };
    case 'language':
      return { hist: [home, '/profile', '/profile/language'] };
    case 'privacy':
      return { hist: [home, '/profile', '/profile/privacy'] };
    default:
      return { hist: [home] };
  }
}
