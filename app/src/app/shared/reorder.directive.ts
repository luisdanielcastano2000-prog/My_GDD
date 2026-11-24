// Reordenar arrastrando (README del sistema de diseño y prototipo, «Reordenar (15)»):
// mantener pulsado 400 ms (time-longpress) levanta la tarjeta (dur-lift 150 ms, escala 1,06); los vecinos se
// apartan (dur-reorder-shift 200 ms); un hueco marca dónde caerá; al soltar se coloca con un pequeño rebote
// (dur-reorder-settle 250 ms). Si el dedo se mueve antes de los 400 ms, es un scroll normal.
// Uso: <ul appReorder [reorderOn]="puedo" (reordered)="..."> con hijos [attr.data-reorder]="id".
// Con teclado o lector de pantalla: «Move up / Move down» del menú ⋮ (sigue igual).
import { Directive, ElementRef, type OnDestroy, inject, input, output } from '@angular/core';

import { EASE, mvK, reduced } from './motion';

interface Slot { x: number; y: number; w: number; h: number }
interface Drag {
  el: HTMLElement; id: string; pid: number; x0: number; y0: number; px: number; py: number; on: boolean;
  timer?: ReturnType<typeof setTimeout>; scroll?: ReturnType<typeof setInterval>;
  items: HTMLElement[]; slots: Slot[]; from: number; to: number; gx: number; gy: number;
  ph?: HTMLElement; scroller?: HTMLElement | null; off: () => void;
}

@Directive({ selector: '[appReorder]', host: { '(pointerdown)': 'down($event)', '(contextmenu)': 'menu($event)' } })
export class ReorderDirective implements OnDestroy {
  /** Se puede reordenar (permisos, sin búsqueda activa…). */
  readonly reorderOn = input(true);
  readonly reordered = output<{ id: string; from: number; to: number }>();
  private host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private drag: Drag | null = null;

  ngOnDestroy(): void {
    this.drag?.off();
  }
  /** Mantener pulsado en el móvil abre el menú del sistema: no mientras se arrastra o se va a arrastrar. */
  menu(e: Event): void {
    if (this.drag) e.preventDefault();
  }

  down(e: PointerEvent): void {
    if (!this.reorderOn() || this.drag || e.button > 0) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-reorder]');
    if (!el || el.parentElement !== this.host) return;
    const move = (ev: PointerEvent) => this.move(ev);
    const up = (ev: PointerEvent) => this.up(ev);
    const touch = (ev: TouchEvent) => { if (this.drag?.on) ev.preventDefault(); };
    const st: Drag = {
      el, id: el.dataset['reorder']!, pid: e.pointerId, x0: e.clientX, y0: e.clientY, px: e.clientX, py: e.clientY, on: false,
      items: [], slots: [], from: 0, to: 0, gx: 0, gy: 0,
      off: () => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        document.removeEventListener('pointercancel', up);
        document.removeEventListener('touchmove', touch);
        clearTimeout(st.timer);
        clearInterval(st.scroll);
      },
    };
    this.drag = st;
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
    document.addEventListener('touchmove', touch, { passive: false });
    st.timer = setTimeout(() => void this.start(), 400 * mvK());
  }

  private async start(): Promise<void> {
    const st = this.drag;
    if (!st || !st.el.isConnected) { st?.off(); this.drag = null; return; }
    const k = mvK(), rm = reduced();
    st.on = true;
    st.items = [...this.host.children].filter((n): n is HTMLElement => n instanceof HTMLElement && !!n.dataset['reorder']);
    const hr = this.host.getBoundingClientRect();
    st.slots = st.items.map((n) => { const r = n.getBoundingClientRect(); return { x: r.left - hr.left, y: r.top - hr.top, w: r.width, h: r.height }; });
    st.from = st.to = st.items.indexOf(st.el);
    const r = st.el.getBoundingClientRect();
    st.gx = st.x0 - r.left;
    st.gy = st.y0 - r.top;
    try { navigator.vibrate?.(12); } catch { /* sin vibración */ }
    this.host.classList.add('reordering');
    st.el.classList.add('lifted');
    st.items.forEach((n) => { if (n !== st.el) n.style.transition = rm ? 'none' : `transform ${200 * k}ms ${EASE.std}`; });
    st.el.style.transition = rm ? 'none' : `transform ${150 * k}ms ${EASE.std}`;
    setTimeout(() => { if (this.drag === st) st.el.style.transition = 'none'; }, 160 * k);
    // Hueco donde caerá
    st.ph = document.createElement('div');
    st.ph.className = 'reorder-ph';
    this.host.appendChild(st.ph);
    this.placeHole();
    this.frame();
    // Desplazar la pantalla al acercarse a los bordes
    const content = this.host.closest('ion-content') as (HTMLElement & { getScrollElement?: () => Promise<HTMLElement> }) | null;
    st.scroller = content?.getScrollElement ? await content.getScrollElement() : null;
    st.scroll = setInterval(() => {
      if (this.drag !== st || !st.scroller) return;
      const sr = st.scroller.getBoundingClientRect();
      if (st.py < sr.top + 56) { st.scroller.scrollTop -= 8; this.frame(); } else if (st.py > sr.bottom - 56) { st.scroller.scrollTop += 8; this.frame(); }
    }, 30);
  }

  private move(ev: PointerEvent): void {
    const st = this.drag;
    if (!st || ev.pointerId !== st.pid) return;
    if (!st.on) { // antes de los 400 ms: si el dedo se mueve, es un scroll
      if (Math.abs(ev.clientX - st.x0) + Math.abs(ev.clientY - st.y0) > 10) { st.off(); this.drag = null; }
      return;
    }
    ev.preventDefault();
    st.px = ev.clientX;
    st.py = ev.clientY;
    this.frame();
  }

  /** Coloca la tarjeta bajo el dedo y aparta a los vecinos si cambia el sitio. */
  private frame(): void {
    const st = this.drag;
    if (!st?.on) return;
    const hr = this.host.getBoundingClientRect();
    const s0 = st.slots[st.from];
    const x = st.px - hr.left - st.gx, y = st.py - hr.top - st.gy;
    st.el.style.transform = `translate(${x - s0.x}px, ${y - s0.y}px) scale(${reduced() ? 1 : 1.06})`;
    const cx = x + s0.w / 2, cy = y + s0.h / 2;
    let best = st.to, bd = Infinity;
    st.slots.forEach((sl, i) => { const d = Math.hypot(sl.x + sl.w / 2 - cx, sl.y + sl.h / 2 - cy); if (d < bd) { bd = d; best = i; } });
    if (best === st.to) return;
    st.to = best;
    st.items.forEach((n, i) => {
      if (n === st.el) return;
      let ni = i;
      if (st.from < st.to && i > st.from && i <= st.to) ni = i - 1;
      if (st.to < st.from && i >= st.to && i < st.from) ni = i + 1;
      const a = st.slots[i], b = st.slots[ni];
      n.style.transform = ni === i ? '' : `translate(${b.x - a.x}px, ${b.y - a.y}px)`;
    });
    this.placeHole();
  }
  private placeHole(): void {
    const st = this.drag;
    if (!st?.ph) return;
    const sl = st.slots[st.to];
    Object.assign(st.ph.style, { left: sl.x + 'px', top: sl.y + 'px', width: sl.w + 'px', height: sl.h + 'px' });
  }

  private up(ev: PointerEvent): void {
    const st = this.drag;
    if (!st || ev.pointerId !== st.pid) return;
    st.off();
    this.drag = null;
    if (!st.on) return; // fue un toque normal
    // El clic que llega al soltar no debe abrir la tarjeta
    const kill = (e: Event) => { e.stopPropagation(); e.preventDefault(); };
    document.addEventListener('click', kill, true);
    setTimeout(() => document.removeEventListener('click', kill, true), 60);
    const drop = st.el.getBoundingClientRect();
    if (st.from !== st.to) this.reordered.emit({ id: st.id, from: st.from, to: st.to });
    // Cuando la lista ya está en su orden nuevo: quitar desplazamientos y colocar la tarjeta con un rebote
    setTimeout(() => requestAnimationFrame(() => {
      st.items.forEach((n) => { n.style.transition = ''; n.style.transform = ''; });
      st.ph?.remove();
      this.host.classList.remove('reordering');
      const el = [...this.host.children].find((n): n is HTMLElement => n instanceof HTMLElement && n.dataset['reorder'] === st.id);
      if (!el) { st.el.classList.remove('lifted'); return; }
      const r = el.getBoundingClientRect();
      const dx = drop.left + drop.width / 2 - (r.left + r.width / 2), dy = drop.top + drop.height / 2 - (r.top + r.height / 2);
      const a = el.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${reduced() ? 1 : 1.06})` }, { transform: 'none' }], { duration: (reduced() ? 0 : 250) * mvK(), easing: EASE.settle });
      const end = () => { el.classList.remove('lifted'); st.el.classList.remove('lifted'); };
      a.finished.then(end, end);
    }), 0);
  }
}
