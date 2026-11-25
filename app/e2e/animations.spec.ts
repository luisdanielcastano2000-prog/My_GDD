// Animaciones del roadmap 5: arranque, desintegración en cuadrados, reconstrucción con Undo y reordenar arrastrando.
import { type Browser, type Page, expect, test } from '@playwright/test';

import { api, deleteAccount, runId, signupUi } from './helpers';

test.describe.configure({ mode: 'serial' });

type Gdd = { id: string; depts: { id: string; name: string; blocks: { id: string; name: string }[] }[] };
let A: Page;
let g: Gdd;
const gddOf = async (): Promise<Gdd> => (await api<{ gdds: Gdd[] }>(A, '/api/me')).gdds[0];
const tile = (name: string) => A.locator('.block-tile', { hasText: name });

/** Mantener pulsado (más de 400 ms) sobre un elemento y arrastrarlo hasta el centro de otro. */
async function longDrag(p: Page, from: string, to: string, hold = 600): Promise<void> {
  const a = (await p.locator(from).first().boundingBox())!,
    b = (await p.locator(to).first().boundingBox())!;
  await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await p.mouse.down();
  await p.waitForTimeout(hold);
  const steps = 12;
  for (let i = 1; i <= steps; i++)
    await p.mouse.move(a.x + a.width / 2 + ((b.x - a.x) * i) / steps, a.y + a.height / 2 + ((b.y - a.y) * i) / steps);
  await p.mouse.up();
}

async function newPage(browser: Browser, reducedMotion: 'reduce' | 'no-preference' = 'no-preference'): Promise<Page> {
  return (await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion })).newPage();
}

test.beforeAll(async ({ browser }) => {
  A = await newPage(browser);
  await signupUi(A, 'ana', runId(), false);
  await A.goto('/new-gdd');
  await A.fill('#ng-name', 'Juego');
  await A.getByRole('radio', { name: /Minimal/ }).click();
  const saved = A.waitForResponse((r) => r.url().includes('/api/gdds/') && r.request().method() === 'PUT' && r.ok());
  await A.getByRole('button', { name: 'Create GDD' }).click();
  await saved;
  g = await gddOf();
});
test.afterAll(async () => {
  await deleteAccount(A);
});

test('arranque: sale al abrir la app, una vez por sesión, y nunca con «menos movimiento»', async ({ browser }) => {
  const p = await newPage(browser);
  await p.goto('/login');
  await expect(p.locator('.splash')).toBeVisible();
  await expect(p.locator('.splash .sp-key')).toHaveCount(4);
  await expect(p.locator('.splash')).toHaveCount(0, { timeout: 3000 }); // ~1,15 s
  await p.reload();
  await expect(p.locator('.splash')).toHaveCount(0);
  const r = await newPage(browser, 'reduce');
  await r.goto('/login');
  await expect(r.locator('.splash')).toHaveCount(0);
});

test('borrar un bloque: se desintegra en 8 cuadrados; con Undo se reconstruye', async () => {
  const name = g.depts[0].blocks[1].name;
  await A.goto(`/gdd/${g.id}/dept/${g.depts[0].id}`);
  await tile(name)
    .getByRole('button', { name: 'More options for ' + name })
    .click();
  await A.locator('.sheet')
    .getByRole('button', { name: /Delete/ })
    .click();
  await expect(tile(name).locator('.tiles > span')).toHaveCount(8); // la desintegración
  await expect(tile(name)).toHaveCount(0); // y luego desaparece
  let conflicts = 0;
  A.on('response', (r) => {
    if (r.url().includes('/api/gdds/') && r.status() === 409) conflicts++;
  });
  await A.locator('.snackbar').getByRole('button', { name: 'Undo' }).click();
  await expect(tile(name)).toHaveCount(1);
  await expect(tile(name).locator('.tiles > span')).toHaveCount(8); // se reconstruye
  await expect(tile(name).locator('.tiles')).toHaveCount(0); // y vuelve la tarjeta de verdad
  await expect(tile(name)).not.toHaveClass(/tiles-on/);
  // Undo no es un «cambio de otra persona»: sin aviso de choque, y el bloque vuelve también en el servidor
  await expect.poll(async () => (await gddOf()).depts[0].blocks.map((b) => b.name)).toContain(name);
  expect(conflicts).toBe(0);
});

test('reordenar bloques manteniendo pulsado y arrastrando', async () => {
  const names = g.depts[0].blocks.map((b) => b.name);
  await A.goto(`/gdd/${g.id}/dept/${g.depts[0].id}`);
  await longDrag(A, `.block-tile:has-text("${names[0]}")`, `.block-tile:has-text("${names[2]}")`);
  await expect(A.locator('.snackbar')).toContainText(`${names[0]} moved to position 3 of ${names.length}`);
  await expect(A).toHaveURL(new RegExp(`/dept/${g.depts[0].id}$`)); // soltar no abre el bloque
  await expect
    .poll(async () => (await gddOf()).depts[0].blocks.map((b) => b.name))
    .toEqual([names[1], names[2], names[0], ...names.slice(3)]);
});

test('un movimiento rápido (sin mantener pulsado) no reordena: es un scroll', async () => {
  const before = (await gddOf()).depts[0].blocks.map((b) => b.name);
  await A.goto(`/gdd/${g.id}/dept/${g.depts[0].id}`);
  await longDrag(A, `.block-tile:has-text("${before[0]}")`, `.block-tile:has-text("${before[2]}")`, 100);
  await A.waitForTimeout(800);
  expect((await gddOf()).depts[0].blocks.map((b) => b.name)).toEqual(before);
});

test('reordenar departamentos', async () => {
  const names = g.depts.map((d) => d.name);
  await A.goto(`/gdd/${g.id}`);
  await longDrag(A, `.dept-card:has-text("${names[2]}")`, `.dept-card:has-text("${names[0]}")`);
  await expect(A.locator('.snackbar')).toContainText(`${names[2]} moved to position 1 of ${names.length}`);
  await expect
    .poll(async () => (await gddOf()).depts.map((d) => d.name))
    .toEqual([names[2], names[0], names[1], ...names.slice(3)]);
});
