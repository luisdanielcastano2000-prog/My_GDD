// «Out of date» (propuesta A): una nota de cambio marca bloques para todo el equipo hasta que alguien los revisa.
// Ana (dueña), Bea (Editor) y Cris (Viewer).
import { type Browser, type Page, expect, test } from '@playwright/test';

import { api, deleteAccount, email, runId, signupUi, skipIfCannotVerify } from './helpers';

test.describe.configure({ mode: 'serial' });

type Gdd = {
  id: string;
  rev: number;
  depts: { id: string; name: string; blocks: { id: string; name: string; status: string; pend: boolean }[] }[];
};
const run = runId();
let A: Page, Bp: Page, C: Page;
let g: Gdd;
const content = (p: Page) => p.locator('ion-content').last();
const gddOf = async (p: Page): Promise<Gdd> => (await api<{ gdds: Gdd[] }>(p, '/api/me')).gdds[0];
const block = (x: Gdd, i: number, j: number) => x.depts[i].blocks[j];

async function newPage(browser: Browser): Promise<Page> {
  return (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
}

test.beforeAll(async ({ browser }) => {
  A = await newPage(browser);
  Bp = await newPage(browser);
  C = await newPage(browser);
  await signupUi(A, 'ana', run);
  await signupUi(Bp, 'bea', run);
  await signupUi(C, 'cris', run);
  await skipIfCannotVerify(A); // con correo de verdad (app publicada), las cuentas de prueba no pueden invitar
  await A.goto('/new-gdd');
  await A.fill('#ng-name', 'Juego de Ana');
  await A.getByRole('radio', { name: /Minimal/ }).click();
  const saved = A.waitForResponse((r) => r.url().includes('/api/gdds/') && r.request().method() === 'PUT' && r.ok());
  await A.getByRole('button', { name: 'Create GDD' }).click();
  await saved;
  g = await gddOf(A);
  // Equipo por la API (lo de invitar ya lo prueba team.spec.ts)
  const me = await api<{ team: { invites: unknown[] } }>(A, '/api/me');
  me.team.invites = [
    { id: 'i1', email: email('bea', run), role: 'Editor' },
    { id: 'i2', email: email('cris', run), role: 'Viewer' },
  ];
  await api(A, '/api/me/team', { method: 'PUT', body: me.team });
  for (const p of [Bp, C]) {
    const inv = (await api<{ invitations: { owner: string }[] }>(p, '/api/me')).invitations[0];
    await api(p, `/api/teams/${inv.owner}/accept`, { method: 'POST' });
  }
});
test.afterAll(async () => {
  for (const p of [A, Bp, C]) await deleteAccount(p);
});

test('Ana guarda un bloque y el aviso «Saved» ofrece «Note a change»; marca dos bloques', async () => {
  const src = block(g, 0, 0);
  await A.goto(`/gdd/${g.id}/dept/${g.depts[0].id}/block/${src.id}`);
  await A.locator('textarea').first().fill('El salto ahora es más alto');
  await A.getByRole('button', { name: 'Save' }).click();
  await A.getByRole('button', { name: 'Note a change' }).click();
  await expect(A).toHaveURL(/\/notes\/new$/);
  await expect(A.locator('.where')).toContainText(g.depts[0].name + ' › ' + src.name);
  await A.locator('#nn-text').fill('Jump height changed');
  await A.getByRole('button', { name: /Blocks affected by this change/ }).click();
  await expect(A.getByRole('checkbox', { name: src.name, exact: true })).toHaveCount(0); // el propio bloque no sale
  await A.getByRole('checkbox', { name: new RegExp('^' + block(g, 0, 1).name) }).click();
  await A.getByRole('checkbox', { name: new RegExp('^' + block(g, 1, 0).name) }).click();
  await expect(A.getByText('2 blocks will be marked out of date for the team')).toBeVisible();
  const sent = A.waitForResponse((r) => r.url().includes('/api/notes/') && r.request().method() === 'PUT' && r.ok());
  await A.getByRole('button', { name: 'Send note' }).click();
  await expect(A.getByText('Note sent · 2 blocks marked out of date')).toBeVisible();
  await sent;
});

test('los bloques quedan «Out of date» para todo el equipo y Home lo cuenta', async () => {
  await expect
    .poll(async () => {
      const x = await gddOf(Bp);
      return [block(x, 0, 1).status, block(x, 1, 0).status, block(x, 0, 0).status];
    })
    .toEqual(['Out of date', 'Out of date', 'Up to date']);
  await A.goto('/home');
  await expect(content(A)).toContainText('2 blocks out of date');
});

test('Bea recibe el aviso de cambio, revisa un bloque y la pantalla Review lo marca', async () => {
  await Bp.goto('/notes');
  await expect(content(Bp)).toContainText('“Jump height changed”');
  await expect(content(Bp)).toContainText(g.depts[0].name + ' › ' + block(g, 0, 0).name);
  await Bp.getByRole('button', { name: /Change in your GDD: “Jump height changed”/ }).click();
  await expect(Bp).toHaveURL(/\/review\//);
  await expect(Bp.locator('button.rv-item')).toHaveCount(2);
  const review = Bp.url();
  await Bp.getByRole('button', { name: new RegExp('Review ' + block(g, 0, 1).name) }).click();
  await expect(content(Bp)).toContainText('This block may be affected by the latest change');
  await Bp.getByRole('button', { name: 'Mark as reviewed' }).click();
  await expect(Bp.locator('.snackbar')).toContainText('reviewed · Up to date');
  await Bp.goto(review);
  await expect(Bp.locator('button.rv-item')).toHaveCount(1);
  await expect(Bp.locator('.rv-item.done')).toHaveCount(1);
});

test('Ana ve que solo queda un bloque por revisar', async () => {
  await expect.poll(async () => block(await gddOf(A), 0, 1).status).not.toBe('Out of date');
  await A.goto(`/gdd/${g.id}/outdated`);
  await expect(A.locator('.od-item')).toHaveCount(1);
  await expect(content(A)).toContainText(block(g, 1, 0).name);
});

test('un Viewer también puede marcar bloques al enviar una nota, pero no revisarlos', async () => {
  await C.goto(`/gdd/${g.id}/dept/${g.depts[1].id}`);
  await C.getByRole('button', { name: /Note a change/ }).click();
  await C.locator('#nn-text').fill('Revisad la música');
  await C.getByRole('button', { name: /Blocks affected by this change/ }).click();
  await C.getByRole('checkbox', { name: new RegExp('^' + block(g, 1, 1).name) }).click();
  const sent = C.waitForResponse((r) => r.url().includes('/api/notes/') && r.request().method() === 'PUT' && r.ok());
  await C.getByRole('button', { name: 'Send note' }).click();
  await sent;
  await expect.poll(async () => block(await gddOf(A), 1, 1).status).toBe('Out of date');
  await C.goto(`/gdd/${g.id}/dept/${g.depts[1].id}/block/${block(g, 1, 1).id}`);
  await expect(C.getByRole('button', { name: 'Mark as reviewed' })).toHaveCount(0);
});
