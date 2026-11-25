// Recorrido general en el navegador (móvil): fechas, datos, feedback, notas y sesiones.
import { type Browser, type Page, expect, test } from '@playwright/test';
import fs from 'node:fs';

import { api, deleteAccount, email, PASSWORD, runId, screenText, signupUi, skipIfCannotVerify } from './helpers';

test.describe.configure({ mode: 'serial' });

const run = runId();
let A: Page, Bp: Page;
let ids: { g: string; dp: string; b: string };

async function newPage(browser: Browser): Promise<Page> {
  return (await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true })).newPage();
}

test.beforeAll(async ({ browser }) => {
  A = await newPage(browser);
  Bp = await newPage(browser);
  await signupUi(A, 'ana', run);
  await signupUi(Bp, 'bea', run);
});
test.afterAll(async () => {
  await deleteAccount(A);
  await deleteAccount(Bp);
});

test('crear un GDD: Home dice «Created today»', async () => {
  await A.goto('/new-gdd');
  await A.fill('#ng-name', 'Juego A');
  await A.getByRole('radio', { name: /Minimal/ }).click();
  const saved = A.waitForResponse((r) => r.url().includes('/api/gdds/') && r.request().method() === 'PUT' && r.ok());
  await A.getByRole('button', { name: 'Create GDD' }).click();
  await A.waitForURL(/\/gdd\//);
  await saved; // la app guarda a los 0,4 s
  const d = await api<{ gdds: { id: string; depts: { id: string; blocks: { id: string }[] }[] }[] }>(A, '/api/me');
  ids = { g: d.gdds[0].id, dp: d.gdds[0].depts[0].id, b: d.gdds[0].depts[0].blocks[0].id };
  await A.goto('/home');
  await expect(A.locator('ion-content').last()).toContainText('Created today');
});

test('escribir y guardar un bloque: sigue tras recargar; «Updated today» y «edited just now»', async () => {
  await A.goto(`/gdd/${ids.g}/dept/${ids.dp}/block/${ids.b}`);
  await A.locator('textarea').first().fill('Hola');
  await A.getByRole('button', { name: /save/i }).first().click();
  await expect(A.getByText(/saved · Up to date/)).toBeVisible();
  await expect.poll(async () => (await api<{ gdds: { uts?: number }[] }>(A, '/api/me')).gdds[0].uts).toBeTruthy(); // ya en el servidor
  await A.reload();
  await expect(A.locator('textarea').first()).toHaveValue('Hola');
  await A.goto('/home');
  await expect(A.locator('ion-content').last()).toContainText('Updated today');
  await expect(A.locator('ion-content').last()).toContainText(/edited just now/i);
});

test('«Member since» con el mes real de alta', async () => {
  await A.goto('/profile/personal');
  const month = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  await expect(A.locator('ion-content').last()).toContainText('Member since ' + month);
});

test('«Download my data» descarga un JSON sin contraseña', async () => {
  const [dl] = await Promise.all([
    A.waitForEvent('download'),
    A.getByRole('button', { name: /Download my data/ }).click(),
  ]);
  expect(dl.suggestedFilename()).toMatch(/^my-gdd-data-\d{4}-\d{2}-\d{2}\.json$/);
  const text = fs.readFileSync((await dl.path())!, 'utf8');
  expect(JSON.parse(text).gdds).toHaveLength(1);
  expect(text).not.toContain('passwordHash');
});

test('«Send feedback» se guarda', async () => {
  await A.goto('/help/feedback');
  await A.locator('textarea').fill('Prueba de feedback');
  const [res] = await Promise.all([
    A.waitForResponse((r) => r.url().includes('/api/me/feedback')),
    A.getByRole('button', { name: 'Send feedback' }).click(),
  ]);
  expect(res.status()).toBe(201);
  await A.waitForURL(/\/help$/);
});

test('nota al equipo: solo tras aceptar, y sin «Ana, Ana»', async () => {
  await skipIfCannotVerify(A);
  const team = await api<{ members: unknown[]; invites: unknown[] }>(A, '/api/me').then(
    (d) => (d as unknown as { team: { members: unknown[]; invites: unknown[] } }).team,
  );
  team.invites = [{ id: 'i', email: email('bea', run), role: 'Editor' }];
  await api(A, '/api/me/team', { method: 'PUT', body: team });
  const inv = (await api<{ invitations: { owner: string }[] }>(Bp, '/api/me')).invitations[0];
  await api(Bp, `/api/teams/${inv.owner}/accept`, { method: 'POST' });
  await A.goto('/notes/new');
  await A.locator('textarea').first().fill('Nota de prueba');
  const sent = A.waitForResponse((r) => r.url().includes('/api/notes/') && r.request().method() === 'PUT' && r.ok());
  await A.getByRole('button', { name: 'Send note' }).click();
  await expect(A.getByText('Note sent')).toBeVisible();
  await sent; // la nota ya está entregada en el servidor
  await Bp.goto('/notes');
  await expect(Bp.locator('ion-content').last()).toContainText('Just now · Ana');
  expect(await screenText(Bp)).not.toContain('Ana, Ana');
});

test('«Log out of other devices»: este aparato sigue dentro y el otro sale', async ({ browser }) => {
  const other = await newPage(browser);
  await other.goto('/login');
  await other.locator('input[type=email]').fill(email('ana', run));
  await other.locator('input[type=password]').fill(PASSWORD);
  await other.locator('button[type=submit]').click();
  await other.waitForURL(/\/home$/);
  await A.goto('/profile/password');
  await A.getByRole('button', { name: /Log out of other devices/ }).click();
  await expect(A.getByText('You’re logged out of all other devices.')).toBeVisible();
  await A.reload();
  await expect(A).toHaveURL(/\/profile\/password$/);
  await other.reload();
  await expect(other).toHaveURL(/\/login$/);
});

test('dos días después las fechas avanzan solas', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const storage = await A.evaluate(() => Object.entries(localStorage));
  await ctx.addInitScript((e) => e.forEach(([k, v]) => localStorage.setItem(k, v)), storage);
  const p = await ctx.newPage();
  await p.clock.install({ time: Date.now() + 2 * 86_400_000 + 3_600_000 });
  await p.goto('/home');
  await expect(p.locator('ion-content').last()).toContainText('Updated 2 days ago');
  await expect(p.locator('ion-content').last()).toContainText('edited 2 days ago');
  // La nota enviada la crea «nota al equipo», que se salta si no se pueden verificar las cuentas (app publicada con correo)
  if ((await api<{ sent: unknown[] }>(A, '/api/me')).sent.length) {
    await p.goto('/notes');
    await p.getByRole('tab', { name: 'Sent' }).click();
    await expect(p.locator('ion-content').last()).toContainText('2 days ago');
  }
});
