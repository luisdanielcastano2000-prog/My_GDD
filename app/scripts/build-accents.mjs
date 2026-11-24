// Genera src/theme/accents.css: la familia «primary» de cada color de acento, en los 4 temas.
// Uso (en app/): npm run accents
//
// Los colores del diseño (tokens.json) salen de Material Theme Builder con la semilla azul #3F48CC
// y «Color match» activado. Eso es SchemeFidelity de @material/material-color-utilities (contraste 0 en
// claro/oscuro y 1 en alto contraste): con la semilla azul da EXACTAMENTE los tokens del diseño (lo
// comprueba este script). Con las otras semillas da las paletas de los demás acentos.
// Cambia las familias primary (botones, enlaces, foco) y secondary (selección: pestaña activa, botones
// segmentados, chips marcados); los colores de los departamentos y los avisos no.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Hct, MaterialDynamicColors as M, SchemeFidelity, argbFromHex, hexFromArgb } from '@material/material-color-utilities';

const here = dirname(fileURLToPath(import.meta.url));
const tokensCss = readFileSync(resolve(here, '../src/theme/tokens.css'), 'utf8');
const out = resolve(here, '../src/theme/accents.css');

/** Acentos que se pueden elegir en Edit profile (nombre → semilla). Blue es el del diseño. */
export const ACCENTS = { Blue: '#3F48CC', Green: '#1E7A3C', Orange: '#E8603C', Purple: '#7B4FC9', Grey: '#78767D' };
const ROLES = {
  primary: 'primary', onPrimary: 'on-primary', primaryContainer: 'primary-container', onPrimaryContainer: 'on-primary-container',
  inversePrimary: 'inverse-primary', primaryFixed: 'primary-fixed', primaryFixedDim: 'primary-fixed-dim', onPrimaryFixed: 'on-primary-fixed', onPrimaryFixedVariant: 'on-primary-fixed-variant',
  // «secondary»: indicador de la pestaña activa, botones segmentados, chips marcados y la banda de las tarjetas en oscuro
  secondary: 'secondary', onSecondary: 'on-secondary', secondaryContainer: 'secondary-container', onSecondaryContainer: 'on-secondary-container',
  secondaryFixed: 'secondary-fixed', secondaryFixedDim: 'secondary-fixed-dim', onSecondaryFixed: 'on-secondary-fixed', onSecondaryFixedVariant: 'on-secondary-fixed-variant',
};
const THEMES = [
  { cls: '', base: ':root', dark: false, contrast: 0 },
  { cls: '.theme-dark', base: ':root.theme-dark', dark: true, contrast: 0 },
  { cls: '.theme-light-hc', base: ':root.theme-light-hc', dark: false, contrast: 1 },
  { cls: '.theme-dark-hc', base: ':root.theme-dark-hc', dark: true, contrast: 1 },
];

const tokenOf = (sel, name) => {
  const i = tokensCss.indexOf(sel + ' {');
  const b = tokensCss.slice(i, tokensCss.indexOf('}', i));
  return (b.match(new RegExp(`--gdd-${name}: (#[0-9A-Fa-f]{6})`)) ?? [])[1];
};
// Contraste WCAG entre dos colores
const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const scheme = (seed, t) => new SchemeFidelity(Hct.fromInt(argbFromHex(seed)), t.dark, t.contrast);
const colors = (seed, t) => Object.fromEntries(Object.entries(ROLES).map(([k, v]) => [v, hexFromArgb(M[k].getArgb(scheme(seed, t))).toUpperCase()]));

// 1) La semilla azul tiene que dar los tokens del diseño (si no, algo cambió en el diseño o en la librería)
for (const t of THEMES) {
  const c = colors(ACCENTS.Blue, t);
  for (const [name, hex] of Object.entries(c)) {
    const want = tokenOf(t.base, name)?.toUpperCase();
    if (want !== hex) throw new Error(`Blue ${t.base} --gdd-${name}: diseño ${want}, generado ${hex}`);
  }
}

// 2) Las demás paletas, con comprobación de contraste (AA): texto sobre botón ≥ 4,5 y enlaces sobre la superficie ≥ 4,5
const lines = ['/* ARCHIVO GENERADO por scripts/build-accents.mjs (npm run accents). No editar a mano. */', '/* Color de acento: familias primary y secondary de cada acento en los 4 temas (el azul es el de tokens.css). */', ''];
const report = [];
for (const [name, seed] of Object.entries(ACCENTS)) {
  if (name === 'Blue') continue;
  for (const t of THEMES) {
    const c = colors(seed, t);
    const surface = tokenOf(t.base, 'surface');
    const r1 = ratio(c['primary'], c['on-primary']), r2 = ratio(c['primary'], surface), r3 = ratio(c['primary-container'], c['on-primary-container']), r4 = ratio(c['secondary-container'], c['on-secondary-container']);
    report.push(`${name.padEnd(7)} ${(t.cls || 'light').padEnd(16)} botón ${r1.toFixed(1)} · enlace ${r2.toFixed(1)} · contenedor ${r3.toFixed(1)} · selección ${r4.toFixed(1)}`);
    if (r1 < 4.5 || r2 < 4.5 || r3 < 4.5 || r4 < 4.5) throw new Error(`Contraste insuficiente: ${report.at(-1)}`);
    lines.push(`:root.accent-${name.toLowerCase()}${t.cls} {`);
    for (const [k, v] of Object.entries(c)) lines.push(`  --gdd-${k}: ${v};`);
    lines.push('}');
  }
  lines.push('');
}
writeFileSync(out, lines.join('\n'));
console.log(report.join('\n'));
console.log('→ ' + out);
