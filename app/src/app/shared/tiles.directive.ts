// Desintegración en cuadrados (al borrar) y reconstrucción (al deshacer) de una tarjeta.
// Como el prototipo (App.dc.html, _sqs/_tiles): 8 cuadrados (4 columnas × 2 filas) con el color de la tarjeta
// y su banda. Salen volando hacia arriba a la derecha (300 ms, 40 ms de desfase por columna, los de la derecha
// primero: dur-dissolve ≈ 420 ms) o vuelven (350 ms tras 150 ms, los de la izquierda primero: dur-rebuild ≈ 620 ms).
// Con «menos movimiento»: solo un fundido de 150 ms.
import { Directive, ElementRef, type OnDestroy, effect, inject, input } from '@angular/core';

import { EASE, mvK, reduced } from './motion';

// Desplazamiento de cada cuadrado al salir [columna][fila] (px), escalado por el tamaño de la tarjeta (prototipo: MV_DISP)
const DISP = [
  [
    [28, -40],
    [36, -18],
  ],
  [
    [48, -56],
    [60, -30],
  ],
  [
    [70, -70],
    [84, -44],
  ],
  [
    [96, -84],
    [110, -58],
  ],
];

@Directive({ selector: '[appTiles]' })
export class TilesDirective implements OnDestroy {
  /** 'out' = desintegrar · 'in' = reconstruir · null = nada. */
  readonly appTiles = input<'out' | 'in' | null>(null);
  private el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private layer: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const mode = this.appTiles();
      if (mode) this.play(mode);
    });
  }
  ngOnDestroy(): void {
    this.layer?.remove();
  }

  private play(mode: 'out' | 'in'): void {
    this.layer?.remove();
    const card = this.el;
    const r = card.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const cs = getComputedStyle(card);
    const bg = cs.backgroundColor;
    const bd = cs.borderTopColor;
    const bw = parseFloat(cs.borderTopWidth) || 0;
    const R = cs.borderTopLeftRadius;
    // La banda de color de la tarjeta (arriba en bloques y GDDs, a la izquierda en departamentos)
    const band = card.querySelector<HTMLElement>(':scope > .band, :scope > .num-band');
    const br = band?.getBoundingClientRect();
    const bandBg = band ? getComputedStyle(band).backgroundColor : '';
    const left = !!br && br.height > r.height * 0.8 && br.width < r.width * 0.5;
    const B = br ? (left ? br.right - r.left : br.bottom - r.top) : 0;

    const layer = document.createElement('div');
    layer.className = 'tiles';
    layer.style.cssText = `left:${-bw}px;top:${-bw}px;width:${r.width}px;height:${r.height}px`; // sobre la tarjeta entera (borde incluido)
    layer.setAttribute('aria-hidden', 'true');
    const sq: HTMLElement[][] = [];
    for (let c = 0; c < 4; c++) {
      sq[c] = [];
      for (let row = 0; row < 2; row++) {
        const s = document.createElement('span');
        const x = (c * r.width) / 4,
          y = (row * r.height) / 2,
          w = r.width / 4,
          h = r.height / 2;
        let fill = bg;
        if (band && left && c === 0 && B > 0)
          fill = `linear-gradient(to right, ${bandBg} 0 ${Math.min(B - x, w)}px, ${bg} ${Math.min(B - x, w)}px)`;
        if (band && !left) {
          const bp = Math.max(0, Math.min(B - y, h));
          if (bp > 0) fill = `linear-gradient(${bandBg} 0 ${bp}px, ${bg} ${bp}px)`;
        }
        const rad = [
          row === 0 && c === 0 ? R : '0',
          row === 0 && c === 3 ? R : '0',
          row === 1 && c === 3 ? R : '0',
          row === 1 && c === 0 ? R : '0',
        ].join(' ');
        const bws = [row === 0 ? bw : 0, c === 3 ? bw : 0, row === 1 ? bw : 0, c === 0 ? bw : 0]
          .map((n) => n + 'px')
          .join(' ');
        s.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;box-sizing:border-box;border:0 solid ${bd};border-width:${bws};border-radius:${rad};background:${fill};will-change:transform,opacity`;
        layer.appendChild(s);
        sq[c][row] = s;
      }
    }
    card.classList.add('tiles-on');
    card.appendChild(layer);
    this.layer = layer;

    const k = mvK();
    const anims: Animation[] = [];
    if (reduced()) {
      anims.push(
        layer.animate(mode === 'out' ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 1 }], {
          duration: 150 * k,
          fill: 'both',
        }),
      );
    } else {
      const fx = Math.min(r.width / 96, 2.2),
        fy = Math.min(r.height / 60, 2);
      for (let c = 0; c < 4; c++)
        for (let row = 0; row < 2; row++) {
          const d = DISP[c][row];
          const far = {
            transform: `translate(${(d[0] * fx).toFixed(1)}px, ${(d[1] * fy).toFixed(1)}px) scale(.2)`,
            opacity: 0,
          };
          const near = { transform: 'none', opacity: 1 };
          anims.push(
            mode === 'out'
              ? sq[c][row].animate([near, far], {
                  duration: 300 * k,
                  delay: (3 - c) * 40 * k,
                  easing: EASE.dis,
                  fill: 'both',
                })
              : sq[c][row].animate([far, near], {
                  duration: 350 * k,
                  delay: (150 + c * 40) * k,
                  easing: EASE.dec,
                  fill: 'both',
                }),
          );
        }
    }
    if (mode === 'in') {
      // Al acabar de reconstruirse, vuelve la tarjeta de verdad (su contenido aparece con un fundido)
      Promise.all(anims.map((a) => a.finished)).then(
        () => {
          if (this.layer !== layer) return;
          card.classList.remove('tiles-on');
          layer.remove();
          this.layer = null;
          card.animate([{ opacity: 0.6 }, { opacity: 1 }], { duration: 150 * k });
        },
        () => undefined,
      );
    }
  }
}
