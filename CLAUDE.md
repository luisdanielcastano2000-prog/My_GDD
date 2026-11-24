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
- **Tokens:** `src/theme/tokens.css` se genera desde `design/system/tokens.json` con `npm run tokens` (repetirlo tras resincronizar el diseño; también regenera los acentos).
- **Color de acento** (roadmap 4): `src/theme/accents.css` lo genera `npm run accents` (`scripts/build-accents.mjs`) con `@material/material-color-utilities` 0.3 (la 0.4 tiene un fallo de empaquetado): `SchemeFidelity`, contraste 0 y 1. Es lo mismo que Material Theme Builder: el script comprueba que la semilla azul da exactamente `tokens.css` y que los demás acentos pasan el contraste AA. Cambia las familias **primary** (botones, enlaces, foco) y **secondary** (selección: pestaña activa, botones segmentados, chips, banda de las tarjetas en oscuro); no los departamentos. Clase `accent-<color>` en `<html>` (efecto en `StoreService`; `previewAccent` en *Edit profile*). Tema y componentes: `src/theme/app.scss`; estructura y pantallas: `src/theme/shell.scss`. Los tokens de movimiento (`dur-*`, `ease-*`) vienen del README del sistema.
- **Animaciones** (roadmap 5, como el prototipo): `shared/motion.ts` (`mvK`, `reduced`, FLIP con `data-flip`), `shared/tiles.directive.ts` (`[appTiles]="store.tile(id)"`: desintegración en 8 cuadrados al borrar y reconstrucción con Undo; bloques, departamentos y tarjetas de Home), `shared/reorder.directive.ts` (`appReorder` + `data-reorder`: mantener pulsado 400 ms y arrastrar; bloques y departamentos → `store.reorder()`), `shared/splash.component.ts` (arranque, una vez por sesión; nunca con «menos movimiento»; deja pasar los toques). Todo respeta lento ×4 y «menos movimiento» (fundidos ≤150 ms).
- **Estructura:** `src/app/data/` (modelos, datos de ejemplo y `StoreService`, la única fuente de verdad), `src/app/shared/` (barra superior, barra de navegación, capas, navegación), `src/app/pages/` (pantallas por grupo). Rutas en `src/app/app.routes.ts`.
- **Fuera de esta versión** (escenas del prototipo sin marco F5): fecha de revisión, calendario y hora de un bloque, y los formularios «New department» / «New block» (en alta fidelidad se crean con un toque).

## Backend (`api/`)

NestJS 12 + Mongoose, ESM (los `import` relativos acaban en `.js`). Base MongoDB `my_gdd`. Se generó sin NestJS Observe (telemetría externa; quitado).

- **Cuentas:** `POST /api/auth/signup`, `POST /api/auth/login` → `{ token }` (JWT, 7 días). Contraseñas con bcrypt. Todas las demás rutas piden `Authorization: Bearer <token>` (`AuthGuard`) y solo tocan los datos de esa cuenta.
- **Datos:** `GET /api/me` (todo: perfil, ajustes, equipo, GDDs propios y compartidos, notas, `invitations`, `teams`), `PATCH /api/me`, `PATCH /api/me/password`, `PUT /api/me/team`, `DELETE /api/me` (borra la cuenta y sus datos y la saca de otros equipos), `PUT|DELETE /api/gdds/:id` (un GDD entero por documento), `PUT|DELETE /api/notes/:id`, `POST /api/notes/read`, `POST /api/teams/:owner/accept|decline|leave`.
- **Equipo y GDDs compartidos** (reglas en `api/src/data/team.ts`, con pruebas en `team.spec.ts`): cada cuenta tiene un equipo. Invitar no da nada: la persona ve la invitación en Notes y en My team y la acepta o rechaza; al aceptar entra en `team.members` con `uid` y ve los GDDs a los que le dieron acceso (`share: { owner, name, role, depts }` en el front). Nadie más que el dueño renombra, ordena o borra el GDD. **Viewer**: solo lee (el servidor responde 403) y envía notas. `PUT /api/me/team` solo deja quitar miembros, cambiar rol/departamento e invitar (no meter a nadie a mano). Una nota enviada llega al equipo del GDD de la nota (dueño + miembros aceptados), nunca a invitaciones sin aceptar.
- **Acceso por proyecto y departamento** (roadmap 2): cada persona del equipo tiene `grants` = `[{ g, role, depts }]` (en `team.members[]` y `team.invites[]`). **Viewer** lee todo el GDD; **Editor** sin `depts` escribe en todo (también la lista de departamentos); **Editor con `depts`** escribe solo en los bloques de esos departamentos (`deptEditAllowed` en el servidor → 403 «You can only edit your departments.»). En el front: `share.depts`, `canEditDept()`, `canManageDepts()`; hojas *Invite* y *Manage* con `GrantsComponent` (`shared/grants.component.ts`). Sin `grants` (personas de antes) = todos los GDDs con su rol. Una nota con «Send to» solo un departamento (`toDept`) llega al dueño y a quien tiene ese departamento en ese GDD.
- **«Out of date»** (roadmap 1, propuesta A): en *New note* se eligen los bloques afectados (`aff` en la nota enviada). El servidor (`NotesController.deliver` + `markOutOfDate` en `team.ts`) los marca en el GDD (`pend: true`, `status: 'Out of date'`, sube `rev`) y entrega a los demás un aviso `kind: 'change'` con `aff`, que abre *Review*. Puede marcar cualquiera del equipo (también un Viewer); revisar (guardar o «Mark as reviewed») solo quien puede editar. «Revisado» se lee del propio bloque, así que es igual para todos. El aviso «Saved» del editor ofrece «Note a change».
- **Dos personas a la vez:** cada GDD lleva `rev`, que sube en cada guardado. Si alguien guardó antes, `PUT /api/gdds/:id` responde 409 con el GDD actual y el front junta los cambios campo a campo y bloque a bloque (`app/src/app/data/merge.ts`, con pruebas en `merge.spec.ts`) y vuelve a guardar; si dos cambian la misma sección, gana la última. El front trae lo nuevo cada 30 s y al volver a la pestaña (`StoreService.refresh()`, solo si no hay nada propio sin guardar y si nada cambió mientras esperaba). Al salir de la pestaña guarda ya lo pendiente; al cerrar o recargar con algo sin guardar, el navegador pregunta.
- **Variables de entorno:** `MONGODB_URI` (si falta: MongoDB local), `JWT_SECRET` (obligatoria en producción), `PORT` (si falta: 3000) y las del correo (abajo).
- **Sesiones:** el token lleva la versión de sesión de la cuenta (`tv`). `PATCH /api/me/password` y `POST /api/me/logout-others` la suben: los tokens de otros aparatos dejan de valer y este recibe uno nuevo. Una cuenta borrada también deja sin valor sus tokens.
- **Límite de intentos:** `POST /api/auth/*`, 10 por minuto y visitante (`@nestjs/throttler` con `IpThrottlerGuard`: en Render cuenta por la cabecera `CF-Connecting-IP` de Cloudflare, porque `req.ip` cambia en cada petición; en el Mac, `req.ip`) → 429.
- **Feedback:** `POST /api/me/feedback` → colección `feedback` (se lee en Atlas). Se borra con la cuenta.
- **Fechas:** cada GDD guarda `cts` (creado) y `uts` (último cambio) en ms; las notas, `ts`. El front escribe «Updated 2 days ago», «5 min ago»… (`src/app/data/time.ts`). `GET /api/me` da `since` (alta de la cuenta).
- **Correo** (roadmap 3, Brevo): `api/src/mail/` (`MailService` + plantillas en inglés). Variables: `BREVO_API_KEY`, `MAIL_FROM` (remitente verificado en Brevo), `MAIL_FROM_NAME` (opcional), `APP_URL` (para los enlaces; nunca se saca de la petición). Modos: `brevo` (con clave), `outbox` (sin clave, fuera de producción: los correos se guardan en la colección `outbox`, se ven en `GET /api/dev/outbox?to=`) y `off` (sin clave en producción: no se envía nada y **no se pide verificar**). Nunca se envía a `@example.com` (cuentas de prueba). Enlaces de un solo uso en la colección `tokens` (sha256, caducan solos): `verify` 48 h, `reset` 1 h, `email` 48 h.
  - Al registrarse: correo «Verify your email» → `/verify?token=` → `POST /api/auth/verify`. Sin verificar (y con correo activo): aviso en Home, Notes y My team, y **no** se puede invitar (`PUT /api/me/team` con invitaciones nuevas → 403) ni aceptar (403). `POST /api/me/verify/resend`.
  - «Forgot password?»: `POST /api/auth/forgot` (responde igual exista o no la cuenta) → `/reset?token=` → `POST /api/auth/reset` (cierra todas las sesiones) + correo «Your password was changed» (también al cambiarla en *Profile › Password*).
  - Invitaciones: correo al guardar una invitación nueva; «Resend» → `POST /api/me/team/resend`.
  - Cambiar el email: `POST /api/me/email` → enlace al email nuevo; la cuenta sigue con el viejo hasta confirmarlo (*Personal info* lo indica). `PATCH /api/me` ya no cambia el email.
- **Simulado:** verificación en dos pasos (el interruptor no hace nada; roadmap 7.2). «Download my data» es real (descarga un JSON en el navegador).

## Pruebas

- **Unitarias** (Vitest): `api/` → `npm test` (reglas del equipo, `team.spec.ts`); `app/` → `npm run test:unit` (unión de cambios, `merge.spec.ts`).
- **De la app entera** (Playwright, en `app/e2e/`, móvil): `api-team.spec.ts` (reglas del equipo por la API, 3 cuentas), `general.spec.ts` (fechas, guardar y recargar, Member since, descarga de datos, feedback, notas, cerrar otras sesiones, reloj +2 días), `team.spec.ts` (3 personas en el navegador: invitar, aceptar, Editor/Viewer, choque de cambios 409, notas, salir con respuesta vieja del refresco). Crean cuentas `@example.com`, las verifican con el enlace del `outbox` (solo en el Mac) y las borran; si llegan al límite de intentos (429), esperan un minuto y siguen. `mail.spec.ts` (correo) solo corre en el Mac. Contra la app publicada **con Brevo activo**, las cuentas de prueba no se pueden verificar y las pruebas que invitan se saltan (lo dicen en el resultado).
  - En el Mac: MongoDB en marcha y `npm run build` en la raíz; luego, en `app/`, `npm run test:e2e` (arranca la app en el puerto 3000 si no está en marcha).
  - Contra la app publicada: en `app/`, `BASE_URL=https://my-gdd.onrender.com npm run test:e2e`.
  - Esperar en las pruebas a que la app guarde (lo hace 0,4 s después de cada cambio): `waitForResponse` del `PUT` o `expect.poll`, no pausas fijas.

## Publicación (Render, un solo servicio)

**En línea:** https://my-gdd.onrender.com (servicio `my-gdd`, Frankfurt, Free; base `my_gdd` en MongoDB Atlas, Cluster0). Variables en Render: `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`. Se vuelve a publicar solo con cada push a `main`. El plan gratis se duerme a los 15 min sin visitas (primera carga ~1 min).

La API sirve también la web compilada (`app/www`, con `@nestjs/serve-static`): una sola dirección, sin CORS. En la raíz, `npm run build` instala y compila `app/` y `api/`; `npm start` arranca la API. Probado en el Mac en modo producción.

## Roadmap

`ROADMAP.md`: lo que queda por hacer, por secciones numeradas, con su estado y las dudas pendientes del usuario. El usuario envía cada sección cuando quiere empezarla; al acabarla se marca ✅ (fecha y commit) y se apunta en la bitácora. Antes de empezar una sección ❓, resolver sus dudas con el usuario.

## Bitácora

`BITACORA.md` registra lo hecho y las decisiones; `RETOMAR.md`, cómo seguir tras una pausa. Leerla al empezar cada sesión y actualizarla después de cada paso o decisión (fechas AAAA-MM-DD; lo no verificado se marca como tal).
