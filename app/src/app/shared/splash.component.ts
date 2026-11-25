// Arranque de la app (README del sistema de diseño, «Arranque de la app», y prototipo #app-splash):
// sobre el azul de la marca aparece el coral; las cuatro teclas saltan en sentido horario formando un anillo
// y este se cierra con una vuelta (dur-splash 1 s, ease-ring). Luego se funde en 150 ms.
// Solo en el arranque en frío: una vez por sesión del navegador. Nunca con «menos movimiento».
// No bloquea nada: deja pasar los toques (pointer-events: none) y es invisible para lectores de pantalla.
import { Component, signal } from '@angular/core';

const KEY = 'gdd-splash';

@Component({
  selector: 'app-splash',
  template: `
    @if (on()) {
      <div class="splash" [class.leaving]="leaving()" aria-hidden="true">
        <svg width="230" height="240" viewBox="-230 -240 460 480">
          <g class="sp-pop" style="--d: 0s">
            <rect x="-44" y="-50" width="88" height="100" rx="20" fill="#E8603C" />
            <rect x="-37" y="-49" width="74" height="74" rx="18" fill="#FF8E6E" />
          </g>
          <g class="sp-ring">
            @for (k of keys; track k.d) {
              <g class="sp-key" [style.--d]="k.d" [style.--x]="k.x" [style.--y]="k.y">
                <g class="sp-pop" [style.--d]="k.d">
                  <rect x="-44" y="-50" width="88" height="100" rx="20" fill="#232BB4" />
                  <rect x="-37" y="-49" width="74" height="74" rx="18" fill="#FDF8F9" />
                </g>
              </g>
            }
          </g>
        </svg>
      </div>
    }
  `,
})
export class SplashComponent {
  protected keys = [
    { d: '.1s', x: 0, y: -106 },
    { d: '.2s', x: 106, y: 0 },
    { d: '.3s', x: 0, y: 106 },
    { d: '.4s', x: -106, y: 0 },
  ];
  protected on = signal(SplashComponent.shouldShow());
  protected leaving = signal(false);

  constructor() {
    if (!this.on()) return;
    sessionStorage.setItem(KEY, '1');
    const k = document.documentElement.classList.contains('motion-slow') ? 4 : 1;
    setTimeout(() => {
      this.leaving.set(true);
      setTimeout(() => this.on.set(false), 150 * k);
    }, 1000 * k);
  }

  private static shouldShow(): boolean {
    try {
      if (sessionStorage.getItem(KEY)) return false; // ya se vio en esta sesión
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
      if (localStorage.getItem('gdd-reduce-motion') === '1') return false; // «menos movimiento» de la cuenta (última vez)
      return !location.pathname.startsWith('/scenes');
    } catch {
      return false;
    }
  }
}
