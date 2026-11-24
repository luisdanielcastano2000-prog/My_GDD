// Ayudas comunes de las pruebas e2e (cuentas de prueba, llamadas a la API, esperas).
import type { APIRequestContext, Page } from '@playwright/test';

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

/** Crea una cuenta por la API y devuelve su token. */
export async function signupApi(request: APIRequestContext, user: string, run: string): Promise<string> {
  return retry429(async () => {
    const r = await request.post('/api/auth/signup', { data: { user, email: email(user, run), password: PASSWORD } });
    return { status: r.status(), value: r.status() === 429 ? '' : ((await r.json()) as { token: string }).token };
  });
}

/** Crea una cuenta desde la pantalla Sign up y espera a llegar a Home. */
export async function signupUi(page: Page, user: string, run: string): Promise<void> {
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
}

/** Llamada a la API desde la página, con el token de su sesión. */
export async function api<T = Record<string, unknown>>(page: Page, path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  return page.evaluate(
    async ([path, method, body]) => {
      const k = Object.keys(localStorage).find((x) => /token/i.test(x)) ?? '';
      const r = await fetch(path, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem(k) } });
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
