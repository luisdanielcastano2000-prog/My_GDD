// El equipo en el navegador, con tres personas a la vez: Ana (dueña), Bea (Editor) y Cris (Viewer).
import { type Browser, type Page, expect, test } from '@playwright/test';

import { api, deleteAccount, email, runId, signupUi, skipIfCannotVerify } from './helpers';

test.describe.configure({ mode: 'serial' });

const run = runId();
let A: Page, Bp: Page, C: Page;
let g: { id: string; dp: string; b1: string; b2: string };
const content = (p: Page) => p.locator('ion-content').last();

async function newPage(browser: Browser): Promise<Page> {
  return (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
}
async function invite(p: Page, to: string, role: 'Editor' | 'Viewer'): Promise<void> {
  await p.getByRole('button', { name: /Invite member/ }).click();
  await p.fill('#inv-email', to);
  if (role === 'Viewer') await p.locator('.sheet').getByRole('radio', { name: 'Viewer' }).click();
  await p.getByRole('button', { name: /Send invite/ }).click();
  await expect(p.getByText('Invitation sent to ' + to)).toBeVisible();
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
  await A.waitForURL(/\/gdd\//);
  await saved; // la app guarda a los 0,4 s
  const d = await api<{ gdds: { id: string; depts: { id: string; blocks: { id: string }[] }[] }[] }>(A, '/api/me');
  const x = d.gdds[0];
  g = { id: x.id, dp: x.depts[0].id, b1: x.depts[0].blocks[0].id, b2: x.depts[0].blocks[1].id };
});
test.afterAll(async () => {
  for (const p of [A, Bp, C]) await deleteAccount(p);
});

test('Ana invita a Bea (Editor) y a Cris (Viewer)', async () => {
  await A.goto('/profile/team');
  await invite(A, email('bea', run), 'Editor');
  await invite(A, email('cris', run), 'Viewer');
  await expect(content(A)).toContainText('Waiting for them to accept');
  await expect.poll(async () => (await api<{ team: { invites: { role: string }[] } }>(A, '/api/me')).team.invites.map((v) => v.role)).toEqual(['Editor', 'Viewer']);
});

test('Bea ve la invitación en Notes y acepta: el GDD sale en su Home', async () => {
  await Bp.goto('/notes');
  await expect(content(Bp)).toContainText('Ana invited you to their team');
  await Bp.getByRole('button', { name: 'Accept' }).click();
  await expect(Bp.getByText('You joined Ana’s team')).toBeVisible();
  await Bp.goto('/home');
  await expect(content(Bp)).toContainText('Shared by Ana · Editor');
});

test('Cris acepta desde My team', async () => {
  await C.goto('/profile/team');
  await C.getByRole('button', { name: 'Accept' }).click();
  await expect(content(C)).toContainText('Teams you’re in');
  await expect(content(C)).toContainText('You’re a viewer');
});

test('Ana y Bea escriben a la vez en bloques distintos: hay choque (409) y se quedan los dos textos', async () => {
  await Bp.goto(`/gdd/${g.id}/dept/${g.dp}/block/${g.b2}`); // Bea abre su bloque con la versión 1
  await A.goto(`/gdd/${g.id}/dept/${g.dp}/block/${g.b1}`);
  const saved = A.waitForResponse((r) => r.url().includes('/api/gdds/') && r.ok());
  await A.locator('textarea').first().fill('Texto de Ana'); // Ana guarda: versión 2
  await saved;
  const conflict = Bp.waitForResponse((r) => r.url().includes('/api/gdds/') && r.status() === 409);
  await Bp.locator('textarea').first().fill('Texto de Bea'); // Bea guarda sobre la 1: 409 → junta → guarda
  await conflict;
  await expect(Bp.getByText('Both changes were kept.')).toBeVisible();
  await expect
    .poll(async () => {
      const b = (await api<{ gdds: { rev: number; depts: { blocks: { id: string; secs: { x: string }[] }[] }[] }[] }>(A, '/api/me')).gdds[0];
      const x = (id: string) => b.depts[0].blocks.find((y) => y.id === id)?.secs[0].x;
      return [x(g.b1), x(g.b2)];
    })
    .toEqual(['Texto de Ana', 'Texto de Bea']);
});

test('Ana ve el texto de Bea sin recargar (al volver a la pestaña)', async () => {
  await A.goto(`/gdd/${g.id}/dept/${g.dp}/block/${g.b2}`);
  await A.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(A.locator('textarea').first()).toHaveValue('Texto de Bea');
});

test('Cris (Viewer) solo lee: sin botones de cambiar ni barra de formato; sí «Note a change»', async () => {
  await C.goto(`/gdd/${g.id}`);
  await expect(content(C)).toContainText('You can read it and send notes');
  await expect(C.getByRole('button', { name: /Department$/ })).toHaveCount(0);
  await expect(C.locator('button.more')).toHaveCount(0);
  await C.goto(`/gdd/${g.id}/dept/${g.dp}`);
  await expect(C.getByRole('button', { name: /Note a change/ })).toBeVisible();
  await expect(C.getByRole('button', { name: /^add ?Block$/ })).toHaveCount(0);
  await C.goto(`/gdd/${g.id}/dept/${g.dp}/block/${g.b1}`);
  await expect(C.locator('textarea').first()).toHaveValue('Texto de Ana');
  expect(await C.locator('textarea').first().evaluate((e) => (e as HTMLTextAreaElement).readOnly)).toBe(true);
  await expect(C.locator('.toolbar')).toHaveCount(0);
  await expect(content(C)).toContainText('You can read this block');
});

test('Cris envía una nota y Ana la recibe en el grupo del GDD', async () => {
  await C.goto('/notes/new');
  await C.locator('textarea').first().fill('Me gusta el estilo');
  const sent = C.waitForResponse((r) => r.url().includes('/api/notes/') && r.request().method() === 'PUT' && r.ok());
  await C.getByRole('button', { name: 'Send note' }).click();
  await expect(C.getByText('Note sent')).toBeVisible();
  await sent; // la nota ya está entregada en el servidor
  await A.goto('/notes');
  await expect(content(A)).toContainText(/Juego de Ana.*Me gusta el estilo.*Just now · Cris/);
});

test('salir del equipo: una respuesta vieja del refresco no vuelve a pintar el GDD', async () => {
  await Bp.goto('/home');
  await expect(content(Bp)).toContainText('Juego de Ana');
  // El refresco pide /api/me y su respuesta (aún con el GDD) llega tarde, después de salir
  let first = true;
  await Bp.route('**/api/me', async (route) => {
    if (first && route.request().method() === 'GET') {
      first = false;
      const res = await route.fetch();
      await new Promise((ok) => setTimeout(ok, 1500));
      await route.fulfill({ response: res });
    } else await route.continue();
  });
  await Bp.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await Bp.getByRole('button', { name: /More options for Juego de Ana/ }).click();
  await Bp.getByRole('button', { name: /Leave Ana’s team/ }).click();
  await expect(content(Bp)).not.toContainText('Juego de Ana');
  await Bp.waitForTimeout(2500); // pasa el momento en que llega la respuesta vieja
  await expect(content(Bp)).not.toContainText('Juego de Ana');
  await Bp.unrouteAll();
  await A.goto('/profile/team');
  await expect(content(A)).toContainText('Members · 2');
});
