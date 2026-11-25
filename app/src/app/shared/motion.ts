// Ayudas de movimiento (README del sistema de diseño, tabla de movimiento):
// multiplicador lento ×4, «menos movimiento» y FLIP (los vecinos se deslizan a su sitio al borrar, deshacer o reordenar).

export const EASE = {
  std: 'cubic-bezier(.2,0,0,1)', // ease-standard
  dec: 'cubic-bezier(.05,.7,.1,1)', // ease-decelerate
  acc: 'cubic-bezier(.3,0,.8,.15)', // ease-accelerate
  dis: 'cubic-bezier(.4,0,1,1)', // desintegración
  settle: 'cubic-bezier(.34,1.56,.64,1)', // soltar al reordenar (pequeño rebote)
};

const root = (): HTMLElement => document.documentElement;
/** Multiplicador de duración: 4 en «lento» (marcos Mov-*-Lento), 1 normal. */
export const mvK = (): number => (root().classList.contains('motion-slow') ? 4 : 1);
/** «Menos movimiento» (ajuste de la app o del sistema): sin saltos ni desplazamientos, solo fundidos de ≤150 ms. */
export const reduced = (): boolean =>
  root().classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Posición de los elementos marcados con data-flip (antes de un cambio). */
export function flipCapture(): Map<string, DOMRect> {
  const m = new Map<string, DOMRect>();
  document
    .querySelectorAll<HTMLElement>('[data-flip]')
    .forEach((el) => m.set(el.dataset['flip']!, el.getBoundingClientRect()));
  return m;
}

/** Tras el cambio: cada elemento que se movió va de su sitio viejo al nuevo (300 ms, ease-standard). */
export function flipPlay(before: Map<string, DOMRect>, dur = 300): void {
  if (reduced()) return;
  requestAnimationFrame(() => {
    document.querySelectorAll<HTMLElement>('[data-flip]').forEach((el) => {
      const o = before.get(el.dataset['flip']!);
      if (!o) return;
      const n = el.getBoundingClientRect();
      const dx = o.left - n.left,
        dy = o.top - n.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
        duration: dur * mvK(),
        easing: EASE.std,
        fill: 'backwards',
      });
    });
  });
}
