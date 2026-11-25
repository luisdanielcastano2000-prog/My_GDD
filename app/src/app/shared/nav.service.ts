import { Injectable, inject } from '@angular/core';
import { NavController, createAnimation, type Animation } from '@ionic/angular';

/**
 * Navegación con pila propia: «atrás» vuelve a la pantalla anterior o, si no la hay
 * (p. ej. al abrir una pantalla directamente), a la pantalla padre que indique cada página.
 */
@Injectable({ providedIn: 'root' })
export class NavService {
  private nav = inject(NavController);
  private stack: string[] = [location.pathname + location.search];

  go(url: string): void {
    this.stack.push(url);
    void this.nav.navigateForward(url);
  }
  /** Sustituye la pantalla actual (p. ej. «Create GDD» → departamentos del GDD nuevo). */
  replace(url: string): void {
    this.stack[this.stack.length - 1] = url;
    void this.nav.navigateForward(url, { replaceUrl: true });
  }
  /** Empieza una pila nueva (pestañas de la barra de navegación, log in, log out). */
  root(url: string, animated = true): void {
    this.stack = [url];
    void this.nav.navigateRoot(url, { animated, animationDirection: 'forward' });
  }
  back(fallback: string): void {
    if (this.stack.length > 1) {
      this.stack.pop();
      void this.nav.navigateBack(this.stack[this.stack.length - 1]);
    } else {
      this.stack = [fallback];
      void this.nav.navigateBack(fallback);
    }
  }
  /** Abre una pantalla con un historial concreto detrás (selector de pantallas). */
  openWithHistory(urls: string[]): Promise<boolean> {
    this.stack = [...urls];
    return this.nav.navigateRoot(urls[urls.length - 1], { animated: false });
  }
}

/**
 * Cambio de pantalla (ficha de movimiento): la nueva entra por la derecha y la anterior
 * se desplaza un 25 %. dur-screen (350 ms), ease-decelerate. Con «menos movimiento»: fundido de 150 ms.
 */
export function screenTransition(
  _: HTMLElement,
  opts: { enteringEl: HTMLElement; leavingEl?: HTMLElement; direction?: string },
): Animation {
  const root = document.documentElement;
  const k = root.classList.contains('motion-slow') ? 4 : 1;
  const back = opts.direction === 'back';
  const entering = createAnimation().addElement(opts.enteringEl).beforeRemoveClass('ion-page-invisible');
  const leaving = createAnimation();
  if (opts.leavingEl) leaving.addElement(opts.leavingEl);

  if (root.classList.contains('reduce-motion')) {
    entering.fromTo('opacity', '0', '1');
    return createAnimation().duration(150).easing('linear').addAnimation([entering, leaving]);
  }
  if (back) {
    entering.fromTo('transform', 'translateX(-25%)', 'translateX(0)');
    leaving.fromTo('transform', 'translateX(0)', 'translateX(100%)');
  } else {
    entering.fromTo('transform', 'translateX(100%)', 'translateX(0)');
    leaving.fromTo('transform', 'translateX(0)', 'translateX(-25%)');
  }
  entering
    .beforeStyles({ 'z-index': back ? '0' : '10', 'box-shadow': back ? 'none' : '-8px 0 24px rgba(0,0,0,.12)' })
    .afterClearStyles(['z-index', 'box-shadow']);
  leaving.beforeStyles({ 'z-index': back ? '10' : '0' }).afterClearStyles(['z-index', 'transform']);
  return createAnimation()
    .duration((back ? 300 : 375) * k)
    .easing(back ? 'cubic-bezier(.2,0,0,1)' : 'cubic-bezier(.05,.7,.1,1)')
    .addAnimation([entering, leaving]);
}
