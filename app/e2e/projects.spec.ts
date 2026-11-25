// Invitar a proyectos concretos, con rol y departamentos (roadmap 2).
// Ana (dueña de dos GDDs), Bea (Editor solo de Art en el GDD 1), Cris (Viewer con Audio) y Dani (Editor de todo el GDD 1).
import { type Browser, type Page, expect, test } from '@playwright/test';

import { api, deleteAccount, email, runId, signupUi, skipIfCannotVerify } from './helpers';

test.describe.configure({ mode: 'serial' });

const run = runId();
const G1 = 'p1-' + run,
  G2 = 'p2-' + run;
const depts = [
  {
    id: 'art',
    name: 'Art',
    col: 1,
    blocks: [
      {
        id: 'b-art',
        name: 'Style',
        status: 'Empty',
        pend: false,
        rem: null,
        secs: [{ id: 's1', t: '', x: '', rev: false, chg: '', b: false, i: false, big: false }],
      },
    ],
  },
  {
    id: 'audio',
    name: 'Audio',
    col: 2,
    blocks: [
      {
        id: 'b-audio',
        name: 'Music',
        status: 'Empty',
        pend: false,
        rem: null,
        secs: [{ id: 's2', t: '', x: '', rev: false, chg: '', b: false, i: false, big: false }],
      },
    ],
  },
];
let A: Page, Bp: Page, C: Page, D: Page;
const content = (p: Page) => p.locator('ion-content').last();
type Me = {
  gdds: { id: string; name: string; rev?: number; depts: typeof depts; share?: { role: string; depts?: string[] } }[];
  team: { members: { id: string; name: string; grants?: unknown }[]; invites: unknown[] };
  invitations: { owner: string; projects?: string[] }[];
  notes: { title: string }[];
};
const me = (p: Page) => api<Me>(p, '/api/me');

async function newPage(browser: Browser): Promise<Page> {
  return (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
}

test.beforeAll(async ({ browser }) => {
  [A, Bp, C, D] = [await newPage(browser), await newPage(browser), await newPage(browser), await newPage(browser)];
  await signupUi(A, 'ana', run);
  await signupUi(Bp, 'bea', run);
  await signupUi(C, 'cris', run);
  await signupUi(D, 'dani', run);
  await skipIfCannotVerify(A); // con correo de verdad (app publicada), las cuentas de prueba no pueden invitar
  await api(A, `/api/gdds/${G1}`, { method: 'PUT', body: { name: 'Juego 1', order: 0, depts } });
  await api(A, `/api/gdds/${G2}`, { method: 'PUT', body: { name: 'Juego 2', order: 1, depts } });
});
test.afterAll(async () => {
  for (const p of [A, Bp, C, D]) await deleteAccount(p);
});

test('Ana invita a Bea solo al Juego 1, como Editor del departamento Art', async () => {
  await A.goto('/profile/team');
  await A.getByRole('button', { name: /Invite member/ }).click();
  await A.fill('#inv-email', email('bea', run));
  const sheet = A.locator('.sheet');
  await expect(sheet.getByRole('checkbox', { name: /Juego 1/ })).toHaveAttribute('aria-checked', 'true'); // por defecto, todos
  await sheet.getByRole('checkbox', { name: /Juego 2/ }).click(); // quitar el Juego 2
  await expect(sheet.getByRole('checkbox', { name: /Juego 2/ })).toHaveAttribute('aria-checked', 'false');
  await sheet.getByRole('button', { name: 'Art' }).click(); // solo Art
  await expect(sheet.getByRole('checkbox', { name: /Juego 1/ })).toContainText('Can edit Art · Reads the rest');
  await sheet.getByRole('button', { name: /Send invite/ }).click();
  await expect(content(A)).toContainText('Editor · 1 of 2 projects · Waiting for them to accept');
  await expect
    .poll(async () => (await me(A)).team.invites)
    .toEqual([
      expect.objectContaining({ email: email('bea', run), grants: [{ g: G1, role: 'Editor', depts: ['art'] }] }),
    ]);
});

test('Bea ve a qué proyecto la invitan, acepta y solo le sale ese GDD', async () => {
  await Bp.goto('/notes');
  await expect(content(Bp)).toContainText('Project: Juego 1');
  await Bp.getByRole('button', { name: 'Accept' }).click();
  await expect(Bp.getByText('You joined Ana’s team')).toBeVisible();
  await Bp.goto('/home');
  await expect(content(Bp)).toContainText('Shared by Ana · Editor (Art)');
  await expect(content(Bp)).not.toContainText('Juego 2');
});

test('Bea escribe en Art, pero Audio y la lista de departamentos son solo lectura', async () => {
  await Bp.goto(`/gdd/${G1}`);
  await expect(content(Bp)).toContainText('You can edit: Art.');
  await expect(Bp.getByRole('button', { name: /Department$/ })).toHaveCount(0);
  await Bp.goto(`/gdd/${G1}/dept/art/block/b-art`);
  const saved = Bp.waitForResponse((r) => r.url().includes('/api/gdds/') && r.request().method() === 'PUT' && r.ok());
  await Bp.locator('textarea').first().fill('Estilo acuarela');
  await saved;
  await Bp.goto(`/gdd/${G1}/dept/audio/block/b-audio`);
  await expect(content(Bp)).toContainText('You edit other departments');
  expect(
    await Bp.locator('textarea')
      .first()
      .evaluate((e) => (e as HTMLTextAreaElement).readOnly),
  ).toBe(true);
  await Bp.goto(`/gdd/${G1}/dept/audio`);
  await expect(Bp.getByRole('button', { name: /^add ?Block$/ })).toHaveCount(0);
});

test('el servidor tampoco deja a Bea tocar Audio ni la lista de departamentos', async () => {
  const g = (await me(Bp)).gdds[0];
  const tryPut = (d: typeof depts) =>
    api<{ statusCode?: number; message?: string }>(Bp, `/api/gdds/${G1}`, {
      method: 'PUT',
      body: { name: g.name, order: 0, rev: g.rev, depts: d },
    });
  const audio = structuredClone(g.depts);
  audio[1].blocks[0].secs[0].x = 'no';
  expect(await tryPut(audio)).toEqual(
    expect.objectContaining({ statusCode: 403, message: 'You can only edit your departments.' }),
  );
  const renamed = structuredClone(g.depts);
  renamed[0].name = 'Arte';
  expect((await tryPut(renamed)).statusCode).toBe(403);
});

test('Ana le añade el Juego 2 como Viewer desde Manage', async () => {
  await A.goto('/profile/team');
  await A.getByRole('button', { name: 'Manage' }).click();
  const sheet = A.locator('.sheet');
  await sheet.getByRole('checkbox', { name: /Juego 2/ }).click();
  await sheet.getByRole('radiogroup', { name: 'Role in Juego 2' }).getByRole('radio', { name: 'Viewer' }).click();
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(A.getByText('Bea’s access was saved')).toBeVisible();
  await expect(content(A)).toContainText('Editor · All projects');
  await expect
    .poll(async () => (await me(Bp)).gdds.map((g) => [g.name, g.share?.role]))
    .toEqual([
      ['Juego 1', 'Editor'],
      ['Juego 2', 'Viewer'],
    ]);
});

test('una nota «a un departamento» solo llega a quien lo tiene (y a la dueña)', async () => {
  // Cris: Viewer del Juego 1 con Audio. Dani: Editor de todo el Juego 1 (sin departamentos).
  const team = (await me(A)).team;
  team.invites = [
    { id: 'ic', email: email('cris', run), grants: [{ g: G1, role: 'Viewer', depts: ['audio'] }] },
    { id: 'id', email: email('dani', run), grants: [{ g: G1, role: 'Editor', depts: [] }] },
  ];
  await api(A, '/api/me/team', { method: 'PUT', body: team });
  for (const p of [C, D]) await api(p, `/api/teams/${(await me(p)).invitations[0].owner}/accept`, { method: 'POST' });
  // Bea (Art) escribe a «Audio» solamente
  await Bp.goto(`/gdd/${G1}/dept/audio`);
  await Bp.getByRole('button', { name: /Note a change/ }).click();
  await Bp.locator('#nn-text').fill('Nueva música');
  await Bp.getByRole('button', { name: 'Whole team' }).click(); // queda solo «Audio»
  const sent = Bp.waitForResponse((r) => r.url().includes('/api/notes/') && r.request().method() === 'PUT' && r.ok());
  await Bp.getByRole('button', { name: 'Send note' }).click();
  await sent;
  const got = async (p: Page) => (await me(p)).notes.some((n) => n.title.includes('Nueva música'));
  expect([await got(A), await got(C), await got(D)]).toEqual([true, true, false]);
});
