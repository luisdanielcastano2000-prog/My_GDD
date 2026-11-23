# My GDD

## Fuente del diseño

- **Lienzo** «My GDD · Fase 5 · Alta fidelidad + movimiento»: https://claude.ai/artifact/6jACSpztGFHjPbmikkEFB1 → copia local en `design/handoff/project/`. `App.dc.html` es la única fuente de todas las pantallas; los marcos `F5-*` y `Mov-*` solo eligen escena y variante.
- **Sistema de diseño** «My GDD»: https://claude.ai/artifact/LCGT6S5t5cxHuzorURbxFB → copia local en `design/system/`. El `README.md` tiene los tokens de movimiento y las notas de cada componente.
- Fecha, versión y lista de archivos: `design/SYNC.md`. La copia es de solo lectura.
- `App.dc.html` pesa unos 460 KB: no cargarlo entero; consultar solo fragmentos (`grep`, `sed -n`).

Para resincronizar: "resincroniza el diseño según design/SYNC.md". Nunca escribir en claude.ai.

## Front (`app/`)

Ionic 9 + Angular 22 (componentes standalone, signals). Datos de ejemplo **en memoria**: al recargar la página vuelven a su estado inicial. Todavía sin backend.

- **Arrancar:** en `app/`, `npx ionic serve` → `http://localhost:8100` (se queda corriendo; `Ctrl + C` para pararlo). Verlo como móvil: herramientas del navegador → vista de dispositivo (390 × 844).
- **Selector de pantallas:** `http://localhost:8100/scenes` abre cada una de las 56 escenas del lienzo (marcos `F5-*`) en su estado, en tema claro u oscuro y con movimiento normal, lento ×4 (marcos `Mov-*-Lento`) o reducido.
- **Tokens:** `src/theme/tokens.css` se genera desde `design/system/tokens.json` con `npm run tokens` (repetirlo tras resincronizar el diseño). Tema y componentes: `src/theme/app.scss`; estructura y pantallas: `src/theme/shell.scss`. Los tokens de movimiento (`dur-*`, `ease-*`) vienen del README del sistema.
- **Estructura:** `src/app/data/` (modelos, datos de ejemplo y `StoreService`, la única fuente de verdad), `src/app/shared/` (barra superior, barra de navegación, capas, navegación), `src/app/pages/` (pantallas por grupo). Rutas en `src/app/app.routes.ts`.
- **Fuera de esta versión** (escenas del prototipo sin marco F5): fecha de revisión, calendario y hora de un bloque, y los formularios «New department» / «New block» (en alta fidelidad se crean con un toque).
