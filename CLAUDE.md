# My GDD

## Fuente del diseño

- **Lienzo** «My GDD · Fase 5 · Alta fidelidad + movimiento»: https://claude.ai/artifact/6jACSpztGFHjPbmikkEFB1 → copia local en `design/handoff/project/`. `App.dc.html` es la única fuente de todas las pantallas; los marcos `F5-*` y `Mov-*` solo eligen escena y variante.
- **Sistema de diseño** «My GDD»: https://claude.ai/artifact/LCGT6S5t5cxHuzorURbxFB → copia local en `design/system/`. El `README.md` tiene los tokens de movimiento y las notas de cada componente.
- Fecha, versión y lista de archivos: `design/SYNC.md`. La copia es de solo lectura.
- `App.dc.html` pesa unos 460 KB: no cargarlo entero; consultar solo fragmentos (`grep`, `sed -n`).

Para resincronizar: "resincroniza el diseño según design/SYNC.md". Nunca escribir en claude.ai.

## Front (`app/`)

Ionic 9 + Angular 22 (componentes standalone, signals). Los datos de cada cuenta se cargan de la API al entrar y cada cambio se guarda solo (`StoreService.sync()`: envía solo lo que ha cambiado). Sesión con token en `localStorage`.

- **Arrancar en el Mac (3 pestañas de terminal, en este orden):**
  1. MongoDB: `~/mongodb/bin/mongod --dbpath ~/mongodb-data --bind_ip localhost --ipv6` (el mismo de Catálogo Tech; base `my_gdd`).
  2. API: en `api/`, `npm run start:dev` → `http://localhost:3000/api`.
  3. Web: en `app/`, `npx ionic serve` → `http://localhost:8100` (las peticiones a `/api` pasan a la API por `proxy.conf.json`).
  Las tres se quedan corriendo; `Ctrl + C` para pararlas. Verlo como móvil: herramientas del navegador → vista de dispositivo (390 × 844).
- **Selector de pantallas** (solo en desarrollo, con datos de ejemplo que no se guardan): `http://localhost:8100/scenes` abre cada una de las 56 escenas del lienzo (marcos `F5-*`) en su estado, en tema claro u oscuro y con movimiento normal, lento ×4 (marcos `Mov-*-Lento`) o reducido.
- **Tokens:** `src/theme/tokens.css` se genera desde `design/system/tokens.json` con `npm run tokens` (repetirlo tras resincronizar el diseño). Tema y componentes: `src/theme/app.scss`; estructura y pantallas: `src/theme/shell.scss`. Los tokens de movimiento (`dur-*`, `ease-*`) vienen del README del sistema.
- **Estructura:** `src/app/data/` (modelos, datos de ejemplo y `StoreService`, la única fuente de verdad), `src/app/shared/` (barra superior, barra de navegación, capas, navegación), `src/app/pages/` (pantallas por grupo). Rutas en `src/app/app.routes.ts`.
- **Fuera de esta versión** (escenas del prototipo sin marco F5): fecha de revisión, calendario y hora de un bloque, y los formularios «New department» / «New block» (en alta fidelidad se crean con un toque).

## Backend (`api/`)

NestJS 12 + Mongoose, ESM (los `import` relativos acaban en `.js`). Base MongoDB `my_gdd`. Se generó sin NestJS Observe (telemetría externa; quitado).

- **Cuentas:** `POST /api/auth/signup`, `POST /api/auth/login` → `{ token }` (JWT, 7 días). Contraseñas con bcrypt. Todas las demás rutas piden `Authorization: Bearer <token>` (`AuthGuard`) y solo tocan los datos de esa cuenta.
- **Datos:** `GET /api/me` (todo: perfil, ajustes, equipo, GDDs, notas), `PATCH /api/me`, `PATCH /api/me/password`, `PUT /api/me/team`, `DELETE /api/me` (borra la cuenta y sus datos), `PUT|DELETE /api/gdds/:id` (un GDD entero por documento), `PUT|DELETE /api/notes/:id`, `POST /api/notes/read`. Una nota enviada nueva se entrega a las personas del equipo (miembros o invitaciones) que tienen cuenta, por su email.
- **Variables de entorno:** `MONGODB_URI` (si falta: MongoDB local), `JWT_SECRET` (obligatoria en producción), `PORT` (si falta: 3000).
- **Simulado (sin servicio de correo):** enlace de contraseña olvidada, envío de invitaciones por email y «Download my data».

## Publicación (Render, un solo servicio)

**En línea:** https://my-gdd.onrender.com (servicio `my-gdd`, Frankfurt, Free; base `my_gdd` en MongoDB Atlas, Cluster0). Variables en Render: `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`. Se vuelve a publicar solo con cada push a `main`. El plan gratis se duerme a los 15 min sin visitas (primera carga ~1 min).

La API sirve también la web compilada (`app/www`, con `@nestjs/serve-static`): una sola dirección, sin CORS. En la raíz, `npm run build` instala y compila `app/` y `api/`; `npm start` arranca la API. Probado en el Mac en modo producción.

## Bitácora

`BITACORA.md` registra lo hecho y las decisiones; `RETOMAR.md`, cómo seguir tras una pausa. Leerla al empezar cada sesión y actualizarla después de cada paso o decisión (fechas AAAA-MM-DD; lo no verificado se marca como tal).
