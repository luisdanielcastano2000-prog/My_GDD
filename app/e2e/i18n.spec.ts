// Idiomas (roadmap 6): la app entera en español y en catalán.
// En cada pantalla comprueba que (1) no se pidió ninguna clave sin traducción y (2) no queda a la vista
// ningún texto en inglés del diccionario (frases de 2 palabras o más que cambian al traducirse).
import { type Page, expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';


import { api, deleteAccount, runId, signupUi } from './helpers';

test.describe.configure({ mode: 'serial' });

/** Diccionario (es.ts / ca.ts) leído como texto: clave inglesa → traducción. */
function dict(lang: 'es' | 'ca'): Record<string, string> {
  const s = fs.readFileSync(path.join(__dirname, `../src/app/i18n/${lang}.ts`), 'utf8');
  const out: Record<string, string> = {};
  for (const m of s.matchAll(/^\s*'((?:[^'\\]|\\.)*)':\s*'((?:[^'\\]|\\.)*)',$/gm)) out[m[1].replace(/\\'/g, "'")] = m[2].replace(/\\'/g, "'");
  return out;
}
/** Textos del catálogo de plantillas: al crear un GDD pasan a ser su contenido (no se traducen después). */
const CONTENT = (() => {
  const s = fs.readFileSync(path.join(__dirname, '../src/app/data/sample.ts'), 'utf8');
  const cat = s.slice(s.indexOf('export const CATALOG'), s.indexOf('];', s.indexOf('export const CATALOG')));
  return new Set([...cat.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1].replace(/\\'/g, "'")));
})();
/** Frases inglesas de la interfaz que no deberían verse en ese idioma (sin huecos {…}, de 2 palabras o más, distintas al traducir). */
const english = (d: Record<string, string>): string[] => Object.entries(d).filter(([k, v]) => k !== v && !k.includes('{') && k.trim().split(/\s+/).length >= 2 && !v.includes(k) && !CONTENT.has(k)).map(([k]) => k);

let A: Page;
let g: { id: string; dp: string; b: string };

async function check(p: Page, where: string, eng: string[]): Promise<void> {
  await p.waitForTimeout(400);
  const missing = await p.evaluate(() => (globalThis as { __i18nMissing?: () => string[] }).__i18nMissing?.() ?? []);
  expect(missing, `${where}: claves sin traducir`).toEqual([]);
  const text = await p.evaluate(() => document.body.innerText + ' ' + [...document.querySelectorAll('[aria-label],[placeholder]')].map((e) => (e.getAttribute('aria-label') ?? '') + ' ' + (e.getAttribute('placeholder') ?? '')).join(' '));
  const seen = eng.filter((k) => text.includes(k));
  expect(seen, `${where}: textos en inglés a la vista`).toEqual([]);
}

/** Recorre todas las pantallas (y abre hojas y diálogos) comprobando el idioma. */
async function tour(p: Page, eng: string[]): Promise<void> {
  const pages = ['/home', '/new-gdd', `/gdd/${g.id}`, `/gdd/${g.id}/dept/${g.dp}`, `/gdd/${g.id}/dept/${g.dp}/block/${g.b}`, `/gdd/${g.id}/outdated`, '/notes', '/notes/new', '/help', '/help/guide', '/help/glossary', '/help/feedback', '/profile', '/profile/edit', '/profile/personal', '/profile/password', '/profile/team', '/profile/language', '/profile/privacy'];
  for (const url of pages) { await p.goto(url); await check(p, url, eng); }
  await p.goto('/notes');
  await p.getByRole('tab').nth(1).click(); // Enviadas
  await check(p, '/notes (sent)', eng);
  await p.goto('/notes/new');
  await p.locator('.aff-toggle').click(); // bloques afectados
  await check(p, '/notes/new (afectados)', eng);
  await p.goto('/profile/team');
  await p.locator('.fab').click(); // hoja «Invitar»
  await check(p, 'hoja Invite', eng);
  await p.goto(`/gdd/${g.id}/dept/${g.dp}`);
  await p.locator('.block-tile button.more').first().click(); // menú ⋮ de un bloque
  await check(p, 'menú de bloque', eng);
  await p.goto('/home');
  await p.locator('.gdd-card button.more').first().click();
  await p.locator('.sheet .li.danger').click(); // diálogo «¿Eliminar…?»
  await check(p, 'diálogo borrar GDD', eng);
}

test.beforeAll(async ({ browser }) => {
  A = await (await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })).newPage();
  await signupUi(A, 'ana', runId());
  await A.goto('/new-gdd');
  await A.fill('#ng-name', 'Juego');
  await A.getByRole('radio', { name: /Minimal/ }).click();
  const saved = A.waitForResponse((r) => r.url().includes('/api/gdds/') && r.request().method() === 'PUT' && r.ok());
  await A.getByRole('button', { name: 'Create GDD' }).click();
  await saved;
  const d = (await api<{ gdds: { id: string; depts: { id: string; blocks: { id: string }[] }[] }[] }>(A, '/api/me')).gdds[0];
  g = { id: d.id, dp: d.depts[0].id, b: d.depts[0].blocks[0].id };
});
test.afterAll(async () => {
  await deleteAccount(A);
});

test('cambiar a español: al momento, sin recargar, y se guarda en la cuenta', async () => {
  await A.goto('/profile/language');
  await A.getByRole('radio', { name: /Español/ }).click();
  await expect(A.locator('.snackbar')).toContainText('Idioma cambiado a Español.');
  await expect(A.locator('app-top-bar')).toContainText('Idioma');
  await expect(A.locator('html')).toHaveAttribute('lang', 'es');
  await expect.poll(async () => (await api<{ user: { lang: string } }>(A, '/api/me')).user.lang).toBe('Español');
});

test('toda la app en español', async () => {
  await tour(A, english(dict('es')));
});

test('fechas y avisos en español; los GDDs nuevos usan la plantilla en español', async () => {
  await A.goto('/home');
  await expect(A.locator('ion-content').last()).toContainText('Creado hoy');
  await A.goto('/new-gdd');
  await A.fill('#ng-name', 'Otro');
  await A.getByRole('radio', { name: /Mínima/ }).click();
  const saved = A.waitForResponse((r) => r.url().includes('/api/gdds/') && r.request().method() === 'PUT' && r.ok());
  await A.getByRole('button', { name: 'Crear GDD' }).click();
  await saved;
  await expect(A.locator('.snackbar')).toContainText('Otro creado');
  await expect(A.locator('ion-content').last()).toContainText('Diseño de juego');
});

test('los mensajes del servidor también se traducen', async () => {
  await A.goto('/profile/password');
  await A.locator('input').nth(0).fill('mala-contraseña');
  await A.locator('input').nth(1).fill('Nueva-12345');
  await A.locator('input').nth(2).fill('Nueva-12345');
  await A.getByRole('button', { name: 'Actualizar contraseña' }).click();
  await expect(A.locator('ion-content').last()).toContainText('La contraseña actual no es correcta.');
});

test('toda la app en catalán', async () => {
  await A.goto('/profile/language');
  await A.getByRole('radio', { name: /Català/ }).click();
  await expect(A.locator('.snackbar')).toContainText('Idioma canviat a Català.');
  await tour(A, english(dict('ca')));
});

test('los idiomas sin traducción no se eligen; el acceso recuerda el idioma', async ({ browser }) => {
  await A.goto('/profile/language');
  await A.getByRole('radio', { name: /Deutsch/ }).click();
  await expect(A.locator('.snackbar')).toContainText('Deutsch encara no està disponible.');
  await expect(A.getByRole('radio', { name: /Català/ })).toHaveAttribute('aria-checked', 'true');
  // Al cerrar sesión, la pantalla de entrada sigue en catalán (se recuerda en este navegador)
  await A.evaluate(() => { const k = Object.keys(localStorage).find((x) => /token/i.test(x)); if (k) localStorage.removeItem(k); });
  await A.goto('/login');
  await expect(A.locator('ion-content')).toContainText('Inicia la sessió');
  await check(A, '/login', english(dict('ca')));
  await A.goto('/signup');
  await check(A, '/signup', english(dict('ca')));
  await A.goto('/forgot');
  await check(A, '/forgot', english(dict('ca')));
  // Un navegador nuevo en español arranca en español
  const p = await (await browser.newContext({ locale: 'es-ES', viewport: { width: 390, height: 844 } })).newPage();
  await p.goto('/login');
  await expect(p.locator('ion-content')).toContainText('Iniciar sesión');
  await A.goto('/login'); // vuelve a entrar para borrar la cuenta al final
});
