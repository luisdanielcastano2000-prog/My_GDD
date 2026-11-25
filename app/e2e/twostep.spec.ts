// Verificación en dos pasos (roadmap 7.2): al entrar desde un navegador nuevo se pide un código de 6 cifras
// que llega por correo. Lee los códigos de la colección outbox: solo en el Mac (la app publicada los envía
// de verdad y nunca a @example.com).
import { type Browser, type Page, expect, test } from '@playwright/test';

import { PASSWORD, api, deleteAccount, email, outbox, runId, signupUi, verifyEmail } from './helpers';

test.describe.configure({ mode: 'serial' });

const run = runId();
const MAIL = email('tina', run);
let A: Page;

async function newPage(browser: Browser): Promise<Page> {
  return (await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })).newPage();
}
/** Último código recibido (el asunto es «123456 is your My GDD code»). */
async function lastCode(p: Page): Promise<string> {
  const m = ((await outbox(p.request, MAIL)) ?? []).find((x) => /is your My GDD code$/.test(x.subject));
  if (!m) throw new Error('No code mail');
  return m.subject.slice(0, 6);
}
const codeMails = async (p: Page): Promise<number> =>
  ((await outbox(p.request, MAIL)) ?? []).filter((x) => /is your My GDD code$/.test(x.subject)).length;

/** Entra desde la pantalla Log in; si el servidor dice «demasiados intentos», espera un minuto y repite. */
async function login(p: Page): Promise<'home' | 'code'> {
  for (let i = 0; i < 3; i++) {
    await p.goto('/login');
    await p.fill('#lg-email', MAIL);
    await p.fill('#lg-pw', PASSWORD);
    const res = p.waitForResponse((r) => r.url().endsWith('/api/auth/login'));
    await p.locator('button[type=submit]').click();
    if ((await res).status() === 429) {
      await p.waitForTimeout(61_000);
      continue;
    }
    await Promise.race([p.waitForURL(/\/home$/), p.locator('#lg-code').waitFor()]);
    return /\/home$/.test(p.url()) ? 'home' : 'code';
  }
  throw new Error('Too many attempts (429)');
}
/** POST a la API (sin sesión); si llega al límite de intentos (429), espera un minuto y repite. */
async function post(p: Page, path: string, data: unknown): Promise<{ status: number; body: unknown }> {
  for (let i = 0; i < 3; i++) {
    const r = await p.request.post(path, { data });
    if (r.status() !== 429) return { status: r.status(), body: await r.json() };
    await p.waitForTimeout(61_000);
  }
  throw new Error('Too many attempts (429)');
}
async function logout(p: Page): Promise<void> {
  await p.evaluate(() => localStorage.removeItem('mygdd.token'));
}
async function typeCode(p: Page, code: string): Promise<void> {
  await p.fill('#lg-code', code);
  await p.locator('button[type=submit]').click();
}
const sw = (p: Page) => p.getByRole('switch', { name: 'Two-step verification' });

test.beforeAll(async ({ browser }) => {
  A = await newPage(browser);
  await signupUi(A, 'tina', run, false); // sin verificar: primero se prueba que no deja activarlo
  test.skip((await outbox(A.request, MAIL)) === null, 'Solo en el Mac: la app publicada envía los correos de verdad.');
});
test.afterAll(async () => {
  await deleteAccount(A);
});

test('sin el email verificado no se puede activar', async () => {
  await A.goto('/profile/password');
  await sw(A).click();
  await expect(A.locator('.snackbar')).toContainText('Verify your email to turn on two-step verification.');
  await expect(sw(A)).toHaveAttribute('aria-checked', 'false');
  expect((await api<{ twoStep: boolean }>(A, '/api/me')).twoStep).toBe(false);
});

test('se activa, y este navegador no pide código', async () => {
  expect(await verifyEmail(A.request, MAIL)).toBe(true);
  await A.reload();
  await sw(A).click();
  await expect(A.locator('.snackbar')).toContainText('Two-step verification is on.');
  await expect(sw(A)).toHaveAttribute('aria-checked', 'true');
  expect((await api<{ twoStep: boolean }>(A, '/api/me')).twoStep).toBe(true);
  await logout(A);
  expect(await login(A)).toBe('home');
  expect(await codeMails(A)).toBe(0);
});

test('un navegador nuevo pide el código del correo; uno equivocado no vale', async ({ browser }) => {
  const B = await newPage(browser);
  expect(await login(B)).toBe('code');
  await expect(B.locator('ion-content')).toContainText(`We sent a 6-digit code to ${MAIL}.`);
  expect(await api<{ statusCode?: number }>(B, '/api/me')).toMatchObject({ statusCode: 401 }); // aún no ha entrado
  const code = await lastCode(B);
  await typeCode(B, code === '000000' ? '111111' : '000000');
  await expect(B.locator('.field-error')).toContainText('That code isn’t right.');
  await typeCode(B, '12');
  await expect(B.locator('.field-error')).toContainText('Enter the 6-digit code.');
  await typeCode(B, code);
  await B.waitForURL(/\/home$/);
  // Ahora este navegador es de confianza
  await logout(B);
  expect(await login(B)).toBe('home');
  await B.context().close();
});

test('«Send a new code» anula el anterior; tras 5 intentos fallidos, el código deja de valer', async ({ browser }) => {
  const C = await newPage(browser);
  const before = await codeMails(C);
  expect(await login(C)).toBe('code');
  const first = await lastCode(C);
  await C.getByRole('button', { name: 'Send a new code' }).click();
  await expect(C.locator('.snackbar')).toContainText(`We sent a new code to ${MAIL}.`);
  expect(await codeMails(C)).toBe(before + 2);
  const second = await lastCode(C);
  if (first !== second) {
    await typeCode(C, first); // el primero ya no vale con el ticket nuevo
    await expect(C.locator('.field-error')).toContainText('That code isn’t right.');
  }
  await C.context().close();
  // Por la API: 5 fallos y ni el código bueno vale
  const { ticket } = (await post(A, '/api/auth/login', { email: MAIL, password: PASSWORD, device: 'otro' })).body as {
    ticket: string;
  };
  const good = await lastCode(A);
  const bad = good === '999999' ? '888888' : '999999';
  for (let i = 0; i < 5; i++)
    expect((await post(A, '/api/auth/login/code', { ticket, code: bad })).status).toBe(i < 4 ? 401 : 400);
  const r = await post(A, '/api/auth/login/code', { ticket, code: good });
  expect(r.status).toBe(400);
  expect(r.body).toMatchObject({ message: 'This code has expired. Send a new one.' });
});

test('«Log out of other devices» hace que los demás vuelvan a pedir código', async ({ browser }) => {
  const D = await newPage(browser);
  expect(await login(D)).toBe('code');
  await typeCode(D, await lastCode(D));
  await D.waitForURL(/\/home$/);
  await A.goto('/profile/password');
  await A.getByRole('button', { name: 'Log out of other devices' }).click();
  await expect(A.locator('.snackbar')).toContainText('You’re logged out of all other devices.');
  await logout(D);
  expect(await login(D)).toBe('code');
  // A, que lo pidió, sigue siendo de confianza
  await logout(A);
  expect(await login(A)).toBe('home');
  await D.context().close();
});

test('al desactivarla, un navegador nuevo entra sin código', async ({ browser }) => {
  await A.goto('/profile/password');
  await expect(sw(A)).toHaveAttribute('aria-checked', 'true');
  await sw(A).click();
  await expect(A.locator('.snackbar')).toContainText('Two-step verification is off.');
  const E = await newPage(browser);
  expect(await login(E)).toBe('home');
  await E.context().close();
});
