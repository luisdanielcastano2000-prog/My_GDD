// Genera src/theme/tokens.css a partir del sistema de diseño (design/system/tokens.json).
// Uso (en app/): npm run tokens   ← volver a ejecutarlo después de resincronizar el diseño.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '../../design/system/tokens.json');
const out = resolve(here, '../src/theme/tokens.css');
const t = JSON.parse(readFileSync(src, 'utf8'));

// Cada tema de color va en una clase de <html>; el claro es el de por defecto.
const SELECTORS = {
  light: ':root',
  dark: ':root.theme-dark',
  'light-high-contrast': ':root.theme-light-hc',
  'dark-high-contrast': ':root.theme-dark-hc',
};

const lines = [];
const push = (s = '') => lines.push(s);

push('/* ARCHIVO GENERADO por scripts/build-tokens.mjs desde design/system/tokens.json. No editar a mano. */');
push(`/* ${t.name} · versión ${t.version} · ${typeof t.meta?.source === 'string' ? t.meta.source : ''} */`);
push();

for (const theme of t.color.themes) {
  push(`${SELECTORS[theme.id]} {`);
  for (const c of t.color.tokens) push(`  --gdd-${c.name}: ${c.value[theme.id]};`);
  push('}');
  push();
}

push(':root {');
push(`  --gdd-font-sans: ${t.type.families.sans};`);
push(`  --gdd-font-mono: 'Roboto Mono', ui-monospace, monospace;`);
for (const g of t.type.groups) {
  for (const s of g.styles) {
    push(`  --gdd-${s.name}-size: ${s.fontSize};`);
    push(`  --gdd-${s.name}-line: ${s.lineHeight};`);
    push(`  --gdd-${s.name}-tracking: ${s.letterSpacing};`);
    push(`  --gdd-${s.name}-weight: ${s.fontWeight};`);
  }
}
for (const k of ['spacing', 'radius', 'shadow', 'opacity', 'size']) {
  for (const x of t[k].tokens) push(`  --gdd-${x.name}: ${x.value};`);
}
push('}');
push();

// Una clase por estilo de texto: .t-body-large, .t-title-medium…  (escala con --gdd-ts, el tamaño de texto del usuario)
for (const g of t.type.groups) {
  for (const s of g.styles) {
    push(`.t-${s.name} { font-family: var(--gdd-font-sans); font-size: calc(var(--gdd-${s.name}-size) * var(--gdd-ts, 1)); line-height: calc(var(--gdd-${s.name}-line) * var(--gdd-ts, 1)); letter-spacing: var(--gdd-${s.name}-tracking); font-weight: var(--gdd-${s.name}-weight); }`);
  }
}

writeFileSync(out, lines.join('\n') + '\n');
console.log('tokens.css generado:', t.color.tokens.length, 'colores ×', t.color.themes.length, 'temas');
