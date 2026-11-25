// Color de acento (roadmap 4): cambia botones, enlaces y selección (familia primary), no los departamentos.
import { type Page, expect, test } from '@playwright/test';

import { deleteAccount, runId, signupUi } from './helpers';

test.describe.configure({ mode: 'serial' });

let A: Page;
const v = (p: Page, name: string) =>
  p.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim().toUpperCase(), name);
const BLUE = '#232BB4'; // --gdd-primary del diseño (tema claro)

test.beforeAll(async ({ browser }) => {
  A = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await signupUi(A, 'ana', runId(), false);
});
test.afterAll(async () => {
  await deleteAccount(A);
});

test('tocar un color lo enseña al momento; al salir sin guardar vuelve el de antes', async () => {
  await A.goto('/profile/edit');
  expect(await v(A, '--gdd-primary')).toBe(BLUE);
  const band = await v(A, '--gdd-bkc-1');
  await A.getByRole('radio', { name: 'Green' }).click();
  await expect.poll(() => v(A, '--gdd-primary')).not.toBe(BLUE);
  expect(await v(A, '--gdd-bkc-1')).toBe(band); // los colores de los departamentos no cambian
  await A.goto('/home');
  await expect.poll(() => v(A, '--gdd-primary')).toBe(BLUE);
});

test('al guardar se queda (también tras recargar) y el botón usa el color nuevo', async () => {
  await A.goto('/profile/edit');
  await A.getByRole('radio', { name: 'Purple' }).click();
  await expect.poll(() => v(A, '--gdd-primary')).not.toBe(BLUE);
  const purple = await v(A, '--gdd-primary');
  await A.getByRole('button', { name: /Save/ }).click();
  await expect(A.locator('.snackbar')).toContainText('Changes saved');
  await A.waitForTimeout(800); // se guarda 0,4 s después
  await A.reload();
  await expect.poll(() => v(A, '--gdd-primary')).toBe(purple);
  await A.goto('/home');
  const bg = await A.getByRole('button', { name: /New GDD/ })
    .first()
    .evaluate((e) => getComputedStyle(e).backgroundColor);
  const hex =
    '#' +
    (bg.match(/\d+/g) ?? [])
      .slice(0, 3)
      .map((n) => Number(n).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  expect(hex).toBe(purple);
});

test('en tema oscuro el acento tiene su versión oscura', async () => {
  await A.goto('/profile/edit');
  const light = await v(A, '--gdd-primary');
  await A.getByRole('radio', { name: 'Dark' }).click();
  await A.getByRole('button', { name: /Save/ }).click();
  await expect(A.locator('.snackbar')).toContainText('Changes saved');
  await expect.poll(() => v(A, '--gdd-primary')).not.toBe(light);
  expect(
    await A.evaluate(() => [...document.documentElement.classList].filter((c) => /accent|theme/.test(c)).sort()),
  ).toEqual(['accent-purple', 'theme-dark']);
});
