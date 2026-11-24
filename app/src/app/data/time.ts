// Fechas relativas («just now», «5 min ago», «yesterday»…) a partir de un momento (ms desde 1970).
// En el idioma de la app (i18n). Los datos de ejemplo traen textos fijos y momentos pequeños (ts: 50): esos se dejan como están.

import { LOCALE, lang, t } from '../i18n/i18n';

/** ¿Es un momento real (no un orden de los datos de ejemplo)? */
export const isReal = (ts: number | null | undefined): ts is number => typeof ts === 'number' && ts > 1e12;

const startOfDay = (now: number) => { const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime(); };

/** Con detalle de minutos: «just now», «5 min ago», «3 h ago», «yesterday», «4 days ago», «on 12 Nov». */
export function ago(ts: number, now = Date.now()): string {
  const s = Math.max(0, (now - ts) / 1000);
  if (s < 60) return t('just now');
  if (s < 3600) return t('{n} min ago', { n: Math.floor(s / 60) });
  if (ts >= startOfDay(now)) return t('{n} h ago', { n: Math.floor(s / 3600) });
  return dayAgo(ts, now);
}

/** Por días: «today», «yesterday», «4 days ago», «on 12 Nov» (o «on 12 Nov 2025» si es de otro año). */
export function dayAgo(ts: number, now = Date.now()): string {
  const today = startOfDay(now);
  if (ts >= today) return t('today');
  const days = Math.ceil((today - ts) / 86_400_000);
  if (days === 1) return t('yesterday');
  if (days < 7) return t('{n} days ago', { n: days });
  return t('on {date}', { date: dateText(ts, now) });
}

/** «12 Nov» (o «12 Nov 2025» si es de otro año). */
export function dateText(ts: number, now = Date.now()): string {
  const d = new Date(ts);
  const year = d.getFullYear() !== new Date(now).getFullYear();
  return d.toLocaleDateString(LOCALE[lang()], { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}) });
}

/** Primera letra en mayúscula. */
export const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
