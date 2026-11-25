// Ayudas comunes de las pruebas e2e (cuentas de prueba, llamadas a la API, esperas).
import { type APIRequestContext, type Page, test } from '@playwright/test';

export const PASSWORD = 'Prueba-12345';
/** Email único de una cuenta de prueba (siempre @example.com: no existe). */
export const email = (user: string, run: string): string => `${user}-${run}@example.com`;
export const runId = (): string => String(Date.now()) + Math.floor(Math.random() * 1000);

/**
 * El servidor deja 10 intentos de Log in / Sign up por minuto. Si una prueba llega al límite (429),
 * espera y lo vuelve a intentar en vez de fallar.
 */
async function retry429<T>(fn: () => Promise<{ status: number; value: T }>): Promise<T> {
  for (let i = 0; i < 4; i++) {
    const r = await fn();
    if (r.status !== 429) return r.value;
    await new Promise((ok) => setTimeout(ok, 61_000));
  }
  throw new Error('Too many attempts (429) after waiting');
}

/** Un correo «enviado» (solo en el Mac: sin servicio de correo se guardan en la colección outbox). */
export interface OutMail {
  to: string;
  subject: string;
  text: string;
  link?: string;
}

/** Correos a una dirección (más nuevo primero). null si no hay outbox (app publicada: se envían de verdad). */
export async function outbox(request: APIRequestContext, to: string): Promise<OutMail[] | null> {
  const r = await request.get('/api/dev/outbox?to=' + encodeURIComponent(to));
  return r.ok() ? ((await r.json()) as OutMail[]) : null;
}
/** El token del enlace del último correo con ese asunto. */
export async function mailToken(request: APIRequestContext, to: string, subject: string): Promise<string> {
  const m = (await outbox(request, to))?.find((x) => x.subject === subject);
  if (!m?.link) throw new Error(`No mail «${subject}» to ${to}`);
  return new URL(m.link).searchParams.get('token') ?? '';
}
/**
 * Verifica el email de una cuenta de prueba con el enlace del correo de bienvenida (solo en el Mac).
 * Devuelve false si no se puede (app publicada con correo: no se manda nada a @example.com).
 */
export async function verifyEmail(request: APIRequestContext, to: string): Promise<boolean> {
  const mails = await outbox(request, to);
  const link = mails?.find((x) => x.subject === 'Verify your email')?.link;
  if (!link) return false;
  const token = new URL(link).searchParams.get('token');
  return retry429(async () => {
    const r = await request.post('/api/auth/verify', { data: { token } });
    return { status: r.status(), value: r.ok() };
  });
}
/** ¿La app pide verificar el email? (si sí y no se puede verificar, las pruebas que invitan se saltan) */
export async function skipIfCannotVerify(page: Page): Promise<void> {
  const me = await api<{ mail?: boolean; emailVerified?: boolean }>(page, '/api/me');
  test.skip(
    !!me.mail && !me.emailVerified,
    'La app publicada envía correos de verdad: las cuentas @example.com no se pueden verificar, así que no pueden invitar.',
  );
}

/** Crea una cuenta por la API (y verifica su email si se puede). Devuelve su token. */
export async function signupApi(request: APIRequestContext, user: string, run: string): Promise<string> {
  const token = await retry429(async () => {
    const r = await request.post('/api/auth/signup', { data: { user, email: email(user, run), password: PASSWORD } });
    return { status: r.status(), value: r.status() === 429 ? '' : ((await r.json()) as { token: string }).token };
  });
  await verifyEmail(request, email(user, run));
  return token;
}

/** Crea una cuenta desde la pantalla Sign up y espera a llegar a Home. verify: verificar su email (si se puede). */
export async function signupUi(page: Page, user: string, run: string, verify = true): Promise<boolean> {
  await retry429(async () => {
    await page.goto('/signup');
    await page.fill('#su-user', user);
    await page.fill('#su-email', email(user, run));
    await page.fill('#su-pw', PASSWORD);
    const res = page.waitForResponse((r) => r.url().includes('/api/auth/signup'));
    await page.locator('button[type=submit]').click();
    const status = (await res).status();
    if (status !== 429) await page.waitForURL(/\/home$/);
    return { status, value: undefined };
  });
  if (!verify) return false;
  const ok = await verifyEmail(page.request, email(user, run));
  if (ok) await page.reload(); // que la app lo sepa
  return ok;
}

/** Llamada a la API desde la página, con el token de su sesión. */
export async function api<T = Record<string, unknown>>(
  page: Page,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  return page.evaluate(
    async ([path, method, body]) => {
      const k = Object.keys(localStorage).find((x) => /token/i.test(x)) ?? '';
      const r = await fetch(path, {
        method,
        body: body === undefined ? undefined : JSON.stringify(body),
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem(k) },
      });
      return r.json() as Promise<T>;
    },
    [path, init.method ?? 'GET', init.body] as const,
  );
}

/** Texto visible de la pantalla actual (espacios juntados). */
export async function screenText(page: Page): Promise<string> {
  return (await page.locator('ion-content').last().innerText()).replace(/\s+/g, ' ');
}

/** Borra la cuenta de la sesión de esa página (limpieza al acabar). */
export async function deleteAccount(page: Page): Promise<void> {
  await api(page, '/api/me', { method: 'DELETE' }).catch(() => null);
}
