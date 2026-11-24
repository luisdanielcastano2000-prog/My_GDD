// Correo (roadmap 3): verificar el email, invitaciones por correo, contraseña olvidada, aviso de cambio
// de contraseña y confirmar un email nuevo. Lee los correos de la colección outbox: solo en el Mac
// (la app publicada los envía de verdad con Brevo y nunca a @example.com).
import { type Browser, type Page, expect, test } from '@playwright/test';

import { PASSWORD, api, deleteAccount, email, mailToken, outbox, runId, signupUi } from './helpers';

test.describe.configure({ mode: 'serial' });

const run = runId();
let A: Page, Bp: Page;
const content = (p: Page) => p.locator('ion-content').last();
const A_MAIL = email('ana', run), B_MAIL = email('bea', run), NEW_MAIL = email('ana-new', run);
const subjects = async (p: Page, to: string) => ((await outbox(p.request, to)) ?? []).map((m) => m.subject);

async function newPage(browser: Browser): Promise<Page> {
  return (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
}

test.beforeAll(async ({ browser }) => {
  A = await newPage(browser);
  Bp = await newPage(browser);
  await signupUi(A, 'ana', run, false); // sin verificar: eso es lo que se prueba
  test.skip((await outbox(A.request, A_MAIL)) === null, 'Solo en el Mac: la app publicada envía los correos de verdad.');
  await signupUi(Bp, 'bea', run, false);
  await api(A, `/api/gdds/m-${run}`, { method: 'PUT', body: { name: 'Juego', order: 0, depts: [] } });
});
test.afterAll(async () => {
  for (const p of [A, Bp]) await deleteAccount(p);
});

test('al registrarse llega el correo para verificar, y la app lo avisa', async () => {
  expect(await subjects(A, A_MAIL)).toEqual(['Verify your email']);
  await A.goto('/home');
  await expect(A.locator('.verify-banner')).toContainText('Verify your email');
});

test('sin verificar no se puede invitar (pantalla y servidor)', async () => {
  await A.goto('/profile/team');
  await A.getByRole('button', { name: /Invite member/ }).click();
  await A.fill('#inv-email', B_MAIL);
  await A.getByRole('button', { name: /Send invite/ }).click();
  await expect(A.locator('.snackbar')).toContainText('Verify your email to invite people');
  const team = (await api<{ team: { members: unknown[]; invites: unknown[] } }>(A, '/api/me')).team;
  team.invites = [{ id: 'x', email: B_MAIL, role: 'Editor' }];
  expect(await api(A, '/api/me/team', { method: 'PUT', body: team })).toEqual(expect.objectContaining({ statusCode: 403, message: 'Verify your email to invite people.' }));
});

test('«Send link» manda otro correo; el enlace verifica y el aviso desaparece', async () => {
  await A.goto('/home');
  await A.locator('.verify-banner').getByRole('button', { name: 'Send link' }).click();
  await expect(A.locator('.snackbar')).toContainText('We sent a new link to ' + A_MAIL);
  const token = await mailToken(A.request, A_MAIL, 'Verify your email');
  await A.goto('/verify?token=' + token);
  await expect(content(A)).toContainText('Email verified');
  await A.getByRole('button', { name: 'Continue' }).click();
  await expect(A).toHaveURL(/\/home$/);
  await expect(A.locator('.verify-banner')).toHaveCount(0);
  await A.goto('/verify?token=' + token); // un enlace solo sirve una vez
  await expect(content(A)).toContainText('This link has expired or was already used.');
});

test('ya verificada, Ana invita a Bea y le llega un correo (y se puede reenviar)', async () => {
  await A.goto('/profile/team');
  await A.getByRole('button', { name: /Invite member/ }).click();
  await A.fill('#inv-email', B_MAIL);
  await A.getByRole('button', { name: /Send invite/ }).click();
  await expect(A.getByText('Invitation sent to ' + B_MAIL)).toBeVisible();
  await expect.poll(() => subjects(A, B_MAIL)).toContain('Ana invited you to My GDD');
  const inv = (await outbox(A.request, B_MAIL))!.find((m) => m.subject === 'Ana invited you to My GDD')!;
  expect(inv.text).toContain('to work on Juego');
  await A.getByRole('button', { name: 'Resend invitation to ' + B_MAIL }).click();
  await expect(A.locator('.snackbar')).toContainText('Invitation sent again to ' + B_MAIL);
  expect((await subjects(A, B_MAIL)).filter((x) => x === 'Ana invited you to My GDD')).toHaveLength(2);
});

test('Bea sin verificar no puede aceptar; al verificar, sí', async () => {
  await Bp.goto('/notes');
  await expect(Bp.locator('.verify-banner')).toBeVisible();
  await Bp.getByRole('button', { name: 'Accept' }).click();
  await expect(Bp.locator('.snackbar')).toContainText('Verify your email to accept invitations');
  await Bp.goto('/verify?token=' + (await mailToken(Bp.request, B_MAIL, 'Verify your email')));
  await expect(content(Bp)).toContainText('Email verified');
  await Bp.goto('/notes');
  await Bp.getByRole('button', { name: 'Accept' }).click();
  await expect(Bp.getByText('You joined Ana’s team')).toBeVisible();
});

test('«Forgot password?»: correo con enlace, contraseña nueva, se cierran las sesiones y llega el aviso', async ({ browser }) => {
  const p = await newPage(browser);
  await p.goto('/login');
  await p.getByRole('button', { name: 'Forgot password?' }).click();
  await p.fill('#fg-email', B_MAIL);
  await p.getByRole('button', { name: 'Send link' }).click();
  await expect(content(p)).toContainText('Check your email');
  const token = await mailToken(p.request, B_MAIL, 'Create a new password');
  await p.goto('/reset?token=' + token);
  await p.fill('#rs-pw', 'Nueva-12345');
  await p.fill('#rs-cf', 'Nueva-12345');
  await p.getByRole('button', { name: 'Save password' }).click();
  await expect(p).toHaveURL(/\/login$/);
  await expect(p.locator('.snackbar')).toContainText('Password changed. Log in with your new password.');
  expect(await subjects(p, B_MAIL)).toContain('Your password was changed');
  await Bp.reload(); // la sesión de Bea en el otro aparato se cerró
  await expect(Bp).toHaveURL(/\/login$/);
  await Bp.locator('input[type=email]').fill(B_MAIL);
  await Bp.locator('input[type=password]').fill('Nueva-12345');
  await Bp.locator('button[type=submit]').click();
  await expect(Bp).toHaveURL(/\/home$/);
  await p.goto('/reset?token=' + token);
  await p.fill('#rs-pw', 'Otra-123456');
  await p.fill('#rs-cf', 'Otra-123456');
  await p.getByRole('button', { name: 'Save password' }).click();
  await expect(p.locator('.snackbar')).toContainText('This link has expired or was already used.');
});

test('cambiar la contraseña en Profile manda el aviso por correo', async () => {
  await A.goto('/profile/password');
  await A.locator('input').nth(0).fill(PASSWORD);
  await A.locator('input').nth(1).fill('Cambiada-123');
  await A.locator('input').nth(2).fill('Cambiada-123');
  await A.getByRole('button', { name: 'Update password' }).click();
  await expect(A.locator('.snackbar')).toContainText('Password updated');
  expect(await subjects(A, A_MAIL)).toContain('Your password was changed');
});

test('cambiar el email: hasta confirmarlo sigue el viejo; el enlace lo cambia', async () => {
  await A.goto('/profile/edit');
  await A.locator('input[type=email]').fill(NEW_MAIL);
  await A.getByRole('button', { name: /Save/ }).click();
  await expect(A.locator('.snackbar')).toContainText('Check ' + NEW_MAIL + ' to confirm your new email');
  await A.goto('/profile/personal');
  await expect(content(A)).toContainText(A_MAIL + ' · Waiting for you to confirm ' + NEW_MAIL);
  await A.goto('/verify?token=' + (await mailToken(A.request, NEW_MAIL, 'Confirm your new email')));
  await expect(content(A)).toContainText('Your account now uses ' + NEW_MAIL);
  await A.goto('/profile/personal');
  await expect(content(A)).toContainText(NEW_MAIL);
  await expect(content(A)).not.toContainText('Waiting for you to confirm');
});
