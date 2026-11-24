// Traducción de la interfaz (roadmap 6): inglés (el del diseño), español y catalán.
//
// El texto en inglés es la clave: t('New GDD') → «Nuevo GDD» en español. Los huecos van entre llaves:
// t('Open {name}', { name }) → «Abrir Hollow Tides». tn(n, '{n} block', '{n} blocks') elige singular o plural.
// En las plantillas: {{ 'New GDD' | t }} · [attr.aria-label]="'Open {name}' | t: { name: g.name }".
// Lo que escribe cada persona (nombres de GDDs, textos, notas) nunca se traduce.
// Diccionarios: es.ts y ca.ts. `npm run i18n:check` comprueba que no falte ninguna clave.
import { Pipe, type PipeTransform, signal } from '@angular/core';

import { CA } from './ca';
import { ES } from './es';

export type Lang = 'en' | 'es' | 'ca';
/** Idiomas con traducción (nombre en la lista de Language → código). El resto, más adelante. */
export const LANGS: Record<string, Lang> = { English: 'en', Español: 'es', Català: 'ca' };
const DICTS: Record<Lang, Record<string, string> | null> = { en: null, es: ES, ca: CA };
/** Locale para fechas y números. */
export const LOCALE: Record<Lang, string> = { en: 'en-GB', es: 'es-ES', ca: 'ca-ES' };

/**
 * Idioma al abrir la app (antes de saber el de la cuenta): el último elegido en este navegador o,
 * si no hay, el del navegador si es español o catalán. Luego manda el de la cuenta (applyLang).
 */
function firstLang(): Lang {
  try {
    const saved = localStorage.getItem('gdd-lang');
    if (saved === 'en' || saved === 'es' || saved === 'ca') return saved;
    const nav = (navigator.language || '').slice(0, 2);
    return nav === 'es' || nav === 'ca' ? nav : 'en';
  } catch {
    return 'en';
  }
}
/** Idioma actual. */
export const lang = signal<Lang>(firstLang());

/** Pone un idioma: textos, <html lang> y recuerdo en el navegador. */
export function applyLang(l: Lang): void {
  lang.set(l);
  document.documentElement.lang = l;
  try { localStorage.setItem('gdd-lang', l); } catch { /* sin almacenamiento */ }
}
/** Claves que no tienen traducción (las pruebas e2e comprueban que quede vacío). */
export const missing = new Set<string>();

type Vars = Record<string, string | number | null | undefined>;

export function t(s: string, vars?: Vars): string {
  const d = DICTS[lang()];
  let out = s;
  if (d) {
    if (s in d) out = d[s];
    else if (s) missing.add(s);
  }
  return vars ? out.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k] ?? '') : m)) : out;
}
/** Singular o plural (con {n}). */
export function tn(n: number, one: string, other: string, vars: Vars = {}): string {
  return t(n === 1 ? one : other, { n, ...vars });
}

/** {{ 'Texto' | t }} — se vuelve a calcular al cambiar de idioma. */
@Pipe({ name: 't', pure: false })
export class TPipe implements PipeTransform {
  transform(s: string, vars?: Vars): string {
    lang(); // depende del idioma
    return t(s, vars);
  }
}

// Para las pruebas: ver las claves sin traducir desde el navegador
(globalThis as { __i18nMissing?: () => string[] }).__i18nMissing = () => [...missing];
