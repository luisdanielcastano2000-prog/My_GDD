// Comprueba las traducciones (npm run i18n:check):
// 1) reúne todas las claves que usa la app: '…' | t, t('…'), tn(n, '…', '…'), textos del catálogo de plantillas,
//    de la ayuda, opciones de los selectores y los mensajes del servidor (api/src);
// 2) falla si a es.ts o ca.ts les falta alguna, o si tienen claves que ya no se usan;
// 3) comprueba que cada traducción conserve los mismos huecos {…} que la clave.
// Con --list escribe las claves que faltan (para traducirlas).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const app = resolve(here, '../src/app');
const api = resolve(here, '../../api/src');
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const unq = (s) => s.replace(/\\'/g, "'");
const keys = new Set();
const add = (k) => { if (k && /[A-Za-z]/.test(k)) keys.add(unq(k)); };

for (const f of walk(app).filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts') && !f.includes('/i18n/') && !f.includes('scenes.page'))) {
  const s = readFileSync(f, 'utf8');
  for (const m of s.matchAll(/'((?:[^'\\]|\\.)*)'\s*\|\s*t\b/g)) add(m[1]);
  // (cond ? 'X' : 'Y') | t — con paréntesis anidados: se busca hacia atrás el «(» que abre
  for (const m of s.matchAll(/\)\s*\|\s*t\b/g)) {
    let i = m.index - 1, depth = 1;
    while (i >= 0 && depth) { if (s[i] === ')') depth++; else if (s[i] === '(') depth--; i--; }
    const expr = s.slice(i + 2, m.index);
    if (expr.includes('?')) for (const q of expr.matchAll(/'((?:[^'\\]|\\.)*)'/g)) if (!/===\s*$/.test(expr.slice(0, q.index))) add(q[1]);
  }
  for (const m of s.matchAll(/\b(?:t|tr)\(\s*'((?:[^'\\]|\\.)*)'/g)) add(m[1]);
  // t(cond ? 'X' : 'Y'): todos los textos de la condición (se lee la llamada entera, con paréntesis anidados)
  for (const m of s.matchAll(/\bt\(/g)) {
    let i = m.index + 2, depth = 1;
    while (i < s.length && depth) { if (s[i] === '(') depth++; else if (s[i] === ')') depth--; i++; }
    // la llamada sin el objeto de huecos (la primera «, {» fuera de comillas)
    const whole = s.slice(m.index + 2, i - 1);
    let cut = whole.length, inQ = false;
    for (let j = 0; j < whole.length; j++) { if (whole[j] === "'" && whole[j - 1] !== '\\') inQ = !inQ; else if (!inQ && whole.startsWith(', {', j)) { cut = j; break; } }
    const call = whole.slice(0, cut);
    if (call.includes('?')) for (const q of call.matchAll(/'((?:[^'\\]|\\.)*)'\s*(?!===)/g)) if (!/===\s*$/.test(call.slice(0, q.index))) add(q[1]);
  }
  for (const m of s.matchAll(/\btn\([^,]+,\s*'((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)'/g)) { add(m[1]); add(m[2]); }
  for (const m of s.matchAll(/\[options\]="\[([^\]]*)\]"/g)) for (const q of m[1].matchAll(/'([^']*)'/g)) add(q[1]); // selectores
}
// Textos que llegan por datos (se traducen con | t o t() al mostrarlos)
const sample = readFileSync(join(app, 'data/sample.ts'), 'utf8');
const cat = sample.slice(sample.indexOf('export const CATALOG'), sample.indexOf('];', sample.indexOf('export const CATALOG')));
for (const m of cat.matchAll(/'((?:[^'\\]|\\.)*)'/g)) add(m[1]);
// Opciones de New GDD (se muestran con | t)
const home = readFileSync(join(app, 'pages/home.pages.ts'), 'utf8');
const opts = home.slice(home.indexOf('protected opts'), home.indexOf(';', home.indexOf('protected opts')));
for (const m of opts.matchAll(/'((?:[^'\\]|\\.)*)'/g)) add(m[1]);
for (const k of ['today', 'yesterday', 'Detailed template', 'Minimal template', 'Blank template', 'Overview', 'What this department does and its goals.', 'Tasks', 'The work to do, in order.', 'References', 'Links, images and examples to follow.',
  'Up to date', 'Empty', 'Out of date', 'Editor', 'Viewer', 'Owner', 'Blue', 'Green', 'Orange', 'Purple', 'Grey', 'Phone', 'Country or region', 'Time zone', 'Whole team',
  'English', 'Spanish', 'Catalan', 'German', 'French', 'Italian', 'Portuguese', 'Japanese', 'Korean', 'Chinese, simplified', 'Current password', 'New password', 'Confirm new password',
  'Enter your current password.', 'The new password needs at least 8 characters.', 'The new passwords don’t match.', 'This email already has an account.', 'Enter an email address, for example name@example.com.']) add(k);
const help = readFileSync(join(app, 'pages/help.pages.ts'), 'utf8').replace(/template: `[\s\S]*?`,\n/g, '');
for (const m of help.matchAll(/(?:title|sub): '((?:[^'\\]|\\.)*)'/g)) add(m[1]);
for (const m of help.matchAll(/^\s*\[?'((?:[^'\\]|\\.)*)'(?:,\s*'((?:[^'\\]|\\.)*)')?\]?,?$/gm)) { add(m[1]); if (m[2]) add(m[2]); }
// Mensajes del servidor (excepciones y validación)
for (const f of walk(api).filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts') && !f.includes('/mail/'))) {
  const s = readFileSync(f, 'utf8');
  for (const m of s.matchAll(/(?:Exception\(|message: )'((?:[^'\\]|\\.)*)'/g)) add(m[1]);
}
for (const k of ['Too many attempts. Wait a minute and try again.']) add(k);
// Valores internos que salen en comparaciones (no se muestran)
for (const k of ['invite people', 'Viewer ']) keys.delete(k);
for (const k of [...keys]) if ((/^[a-z0-9_]+$/.test(k) && !['today', 'yesterday'].includes(k)) || k.length < 2) keys.delete(k);

const dict = (lang) => { const s = readFileSync(join(app, `i18n/${lang}.ts`), 'utf8'); const o = {}; for (const m of s.matchAll(/^\s*'((?:[^'\\]|\\.)*)':\s*'((?:[^'\\]|\\.)*)',?$/gm)) o[unq(m[1])] = unq(m[2]); return o; };
let bad = 0;
const holes = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
for (const lang of ['es', 'ca']) {
  const d = dict(lang);
  const miss = [...keys].filter((k) => !(k in d));
  const extra = Object.keys(d).filter((k) => !keys.has(k));
  const wrong = Object.entries(d).filter(([k, v]) => holes(k) !== holes(v));
  if (miss.length) { bad++; console.log(`${lang}: faltan ${miss.length}`); if (process.argv.includes('--list')) miss.forEach((k) => console.log('  ' + JSON.stringify(k))); }
  if (extra.length) { bad++; console.log(`${lang}: sobran ${extra.length}:`, extra.slice(0, 20)); }
  if (wrong.length) { bad++; console.log(`${lang}: huecos distintos:`, wrong.slice(0, 10)); }
}
console.log(`${keys.size} claves · ${bad ? 'HAY PROBLEMAS' : 'es y ca completos'}`);
process.exit(bad ? 1 : 0);
