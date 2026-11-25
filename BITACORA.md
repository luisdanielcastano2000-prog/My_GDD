# Bitácora · My GDD

Registro de lo que hemos hecho y de las decisiones tomadas, para no perder contexto entre sesiones.
Cómo arrancar y cómo está organizado el proyecto: `CLAUDE.md`. Aquí va **lo que ha pasado de verdad**.

---

## Estado actual (actualizado 2026-11-23, al terminar la sesión)

- **Hecho:** copia local del diseño (`design/`), repositorio en GitHub y front completo en Ionic + Angular (`app/`) con las 56 pantallas del lienzo, revisadas en el navegador.
- **Datos:** cuentas reales en MongoDB (base `my_gdd`) a través de la API NestJS (`api/`). En el Mac, MongoDB local; en Render, Atlas.
- **Siguiente:** el usuario crea el servicio en Render (guía dada: Build `npm run build`, Start `npm start`, variables `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV`). Luego Claude comprueba la dirección pública.
- **Para retomar:** `RETOMAR.md` (prompt para pegar + guía de Render).
- **Procesos corriendo:** ninguno al cerrar la sesión (MongoDB local, API y web los arrancó Claude y se apagan con ella).
- **Control de versiones:** Git, rama `main`, remoto `origin` = GitHub `luisdanielcastano2000-prog/My_GDD` (**público**). Todo subido a GitHub hasta `e51342b` (push aprobado por el usuario, 2026-11-23).

---

## Decisiones tomadas

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-11-23 | La fuente del diseño son dos artifacts de claude.ai: el lienzo «My GDD · Fase 5 · Alta fidelidad + movimiento» y el sistema de diseño «My GDD». Se copian a `design/` **solo para leer**; nunca se escribe en claude.ai. | Pedido por el usuario. |
| 2026-11-23 | Vía de copia: leer los artifacts por su URL con la cuenta de la sesión (vía *a*). No hizo falta el conector de Claude Design (vía *b*). | Funcionó a la primera. |
| 2026-11-23 | Se copian solo los archivos del proyecto (`project/`), no los del visor (`index.html`, `SKILL.md`, `artifact-type/`). | Lo pedía el usuario: no sirven fuera de claude.ai. |
| 2026-11-23 | `CLAUDE.md` se crea con la sección «Fuente del diseño» (no existía). | Paso 5 del encargo. |
| 2026-11-23 | Autor de los commits: `Luis` + email *noreply* de GitHub, configurado solo en este repositorio. | Elegido por el usuario («igual que Catálogo Tech»). |
| 2026-11-23 | El repositorio se sube a `My_GDD` (público). El usuario escribió «My_GD», pero ese repositorio no existía; el que había creado, vacío y público, era `My_GDD`. | Comprobado antes del push. |
| 2026-11-23 | Front con **Ionic + Angular**, **todas las pantallas** y **datos de ejemplo en memoria**. | Elegido por el usuario (frente a HTML/JS sin frameworks, React o Android nativo). |
| 2026-11-23 | Proyecto generado con `npx @ionic/cli@7 start app blank --type=angular-standalone` (Ionic 9, Angular 22), sin instalaciones globales. | Generador oficial; `npx` evita instalar nada en el sistema. |
| 2026-11-23 | En `ionic.config.json`, `type: "angular-standalone"` → `"angular"`. | Fallo del generador: su propio `ionic serve` no reconoce ese tipo. |
| 2026-11-23 | Los colores, tipografía, formas, sombras… salen de `design/system/tokens.json` mediante un script (`npm run tokens` → `src/theme/tokens.css`). Los tokens de movimiento (`dur-*`, `ease-*`) se copian del README del sistema. | Una sola fuente de verdad; tras resincronizar el diseño basta con volver a generar. `tokens.json` no admite movimiento. |
| 2026-11-23 | Solo se hace la versión de **alta fidelidad** (marcos `F5-*`). Quedan fuera las escenas del prototipo sin marco: fecha de revisión de un bloque (calendario y hora) y los formularios «New department» / «New block». | En alta fidelidad departamentos y bloques se crean con un toque. |
| 2026-11-23 | Un `StoreService` (signals) guarda los datos y todas las acciones, portadas de la lógica del prototipo (`App.dc.html`). Las capas (hojas, diálogos, snackbar) son globales. | Una única fuente de verdad, igual que el prototipo. |
| 2026-11-23 | Selector de pantallas en `/scenes`: abre cada una de las 56 escenas en su estado, en claro u oscuro, con movimiento normal, lento ×4 o reducido. | Para revisar el diseño escena a escena (equivale a los marcos `F5-*` y `Mov-*`). |
| 2026-11-23 | Simplificaciones: al borrar, la tarjeta se encoge y se desvanece (no se deshace en cuadrados); no hay reordenar arrastrando (sí *Move up/down*); el color de acento se elige pero no cambia la paleta. | Ahorrar trabajo en detalles de animación; quedan anotadas como pendientes. |
| 2026-11-23 | Se mantiene `@import` en `global.scss` (Sass avisa de que está obsoleto). | Con `@use` los estilos propios quedaban antes que los de Ionic y perdían. |
| 2026-11-23 | Para revisar las pantallas se instala el navegador de Playwright (Chromium, ~150 MB) en `~/Library/Caches/ms-playwright`, fuera del proyecto. | El sistema de permisos lo bloqueó la primera vez; el usuario lo autorizó («hazlo tú»). |
| 2026-11-23 | Backend con **NestJS + Mongoose**; **cuentas reales** (contraseña cifrada con bcrypt, sesión con token JWT); MongoDB en el **mismo clúster de Atlas** de Catálogo Tech (Cluster0), base nueva `my_gdd`; Render con **un solo servicio** (el backend sirve también la web). | Elegido por el usuario (todas las opciones recomendadas). |
| 2026-11-23 | Las cuentas nuevas empiezan **vacías** («You don’t have any GDD yet»). | Elegido por el usuario. |
| 2026-11-23 | Backend generado con `npx @nestjs/cli new api --skip-git`; se quita **NestJS Observe** (telemetría a un servicio externo que trae la plantilla). | No hace falta y es una pieza externa menos. |
| 2026-11-23 | `bcryptjs` (JavaScript puro) en vez de `bcrypt`; JWT con `@nestjs/jwt` y un `AuthGuard` propio; validación con `class-validator` (como en Catálogo Tech). | Sin compilar nada nativo; piezas conocidas. |
| 2026-11-23 | Un GDD = un documento de MongoDB (departamentos, bloques y secciones dentro). Los ids los genera el front (`crypto.randomUUID`). El front guarda solo lo que cambia (`StoreService.sync()`), y si falla enseña el snackbar de error con *Retry*. | Encaja con cómo el front ya maneja los datos; menos rutas y menos código. |
| 2026-11-23 | Las notas enviadas se entregan a las personas del equipo que tienen cuenta (por email); llegan a «From your team». | Hace reales las notas del equipo sin servicio de correo. |
| 2026-11-23 | Siguen simulados: enlace de contraseña olvidada, invitaciones por email y «Download my data». | Necesitarían un servicio de correo. |
| 2026-11-23 | `/scenes` solo en desarrollo (`isDevMode`). La sesión (token) se guarda en `localStorage` para no perderla al recargar. | El selector usa datos de ejemplo que no deben mezclarse con cuentas reales. |
| 2026-11-23 | Raíz con `package.json` (`npm run build` / `npm start`) para Render, y `.gitignore` en la raíz y en `api/`. | Render solo necesita dos comandos; `node_modules/` y `dist/` no se suben. |

---

## Registro por sesiones

### 2026-11-23

**Diseño**
- Leídos los dos artifacts por su URL (`get_artifact` → `list_files` → `read_file` guardando en disco, sin cargar `App.dc.html` en la conversación).
- Copiados 147 archivos del lienzo a `design/handoff/project/` y 35 del sistema a `design/system/`. Comprobado: el sha256 de cada archivo coincide con el original; `App.dc.html` pesa 460 295 bytes; los JSON son válidos; hay 112 marcos `F5-*`, 30 `Mov-*` y 2 `Prototipo-HF-*`.
- Los dos `tokens.json` (lienzo y sistema) son idénticos.
- Aviso: los marcos `*.dc.html` necesitan `support.js` del visor de claude.ai; fuera de él solo sirven de referencia.
- Creados `design/SYNC.md` (fecha, URLs, versiones, vía, lista de archivos con sha256 y cómo resincronizar) y `CLAUDE.md`.
- Commit `9d815f1` «Diseño: copia local del lienzo F5 y del sistema My GDD».

**GitHub**
- `gh` no está instalado y el token del usuario solo tenía permiso sobre `PruebaCIFO_DEL`: el usuario creó el repositorio en la web y dio permiso al token.
- `git remote add origin …/My_GDD.git` y `git push -u origin main`. Comprobado en GitHub: commit `9d815f1` en `main`.

**Front · paso 1: proyecto**
- Generado `app/` con el CLI de Ionic. Compila (`ng build`). Arreglado `ionic.config.json` para que `ionic serve` arranque. Servidor en `http://localhost:8100` (responde 200).
- Commit local `66252dd`.

**Front · pasos 2 a 6 (hechos seguidos, a petición del usuario)**
- Tema: `scripts/build-tokens.mjs` → `src/theme/tokens.css` (66 colores × 4 temas: claro, oscuro y sus versiones de alto contraste; tipografía, espacios, esquinas, sombras, opacidades y tamaños). `src/theme/app.scss` (variables propias del prototipo, movimiento y componentes: botones, campos, tarjetas, chips, button group, interruptor…) y `src/theme/shell.scss` (barra superior, barra de navegación, capas y cada pantalla). Fuentes Roboto, Roboto Mono y Material Symbols Rounded.
- Datos: `src/app/data/` (`models.ts`, `sample.ts` con Hollow Tides y Pixel Kitchen, `store.service.ts`).
- Piezas comunes: `src/app/shared/` (barra superior, barra de navegación con aviso de no leídas, hojas de acciones, diálogos, snackbar con Undo, navegación con pila propia y la transición de pantalla de la ficha de movimiento: entra por la derecha, la anterior se desplaza un 25 %).
- Pantallas: 25 páginas en `src/app/pages/` que cubren las 56 escenas (acceso, Home, nuevo GDD, departamentos, departamento, editor, review, out of date, notas, nueva nota, ayuda, guía, glosario, feedback, perfil, editar perfil, datos personales, contraseña, equipo, idioma y privacidad) + `/scenes`.
- Accesibilidad que funciona: tamaño de texto, alto contraste y «menos movimiento» desde *Profile › Accessibility*.
- Compila y pasa el linter. Commit local `81e4b2b`. `CLAUDE.md` con la sección «Front (`app/`)».

**Revisión en el navegador**
- Capturas de las 56 escenas en claro y en oscuro (390 × 844): ningún error en la consola.
- Errores encontrados y corregidos: barra superior enorme en el editor y icono roto en «Sent» (dos clases con el mismo nombre que otras pantallas), sombra de Ionic bajo la cabecera, la lista no bajaba hasta el departamento o bloque recién creado, el snackbar podía taparlo y la vista previa del tamaño de texto no crecía.
- Prueba de uso real (12 comprobaciones, todas bien): errores de login, login → Home → departamentos → Animation (5 bloques) → editor → guardar («Splines saved · Up to date») → borrar bloque con Undo → «+ Block» → enviar nota → texto «Larger» y alto contraste.
- Nota de diseño: en la tarjeta de un departamento, el aviso «N out of date» es un enlace propio (lleva a la lista de bloques desactualizados).
- Commit local `3c902ce`.

**Bitácora**
- Creado este archivo a petición del usuario. Commit `13f152a`.

**Backend + base de datos (hecho seguido, a petición del usuario)**
- `api/` generado con el CLI de NestJS 12; instalados `@nestjs/mongoose`, `mongoose`, `@nestjs/jwt`, `bcryptjs`, `class-validator`, `class-transformer`, `@nestjs/serve-static`.
- Código: `src/data/schemas.ts` (users, gdds, notes), `src/auth/` (signup/login, guard, DTO con mensajes del diseño), `src/data/data.controller.ts` (me, gdds, notes), `src/main.ts` (prefijo `/api`, validación), `src/app.module.ts` (MongoDB, JWT, la web).
- Probado con `curl` contra MongoDB local: 401 sin token, 400 con email mal, 409 con email repetido, 401 con contraseña mal, guardar y leer un GDD, contraseña actual incorrecta, la web servida en `/` y `/home`.
- Front: `api.service.ts` (peticiones + token), `StoreService` con `load()`, `logout()` y `sync()`; guards de rutas; Log in / Sign up / Log out / borrar cuenta / cambiar contraseña reales; grupo «From your team» en Notes; proxy de desarrollo (`proxy.conf.json`).
- Prueba completa en el navegador (9 comprobaciones, todas bien, sin errores JS): sin sesión → Log in; Sign up → Home vacía; crear GDD Minimal → 4 departamentos; **recargar → siguen**; escribir en un bloque y guardar → **sigue tras recargar**; Log out; contraseña mal → aviso; Log in → los datos están; el ajuste «Large» se guarda en la cuenta.
- Entrega de notas probada con dos cuentas: Tester invita a Lena, envía una nota y Lena la recibe («From: Tester», sin leer).
- Modo producción en el Mac (`npm run build` + `npm start` con `NODE_ENV=production`): la misma prueba completa, toda bien, con web y API en un solo puerto.
- Linter sin errores en `app/` y `api/`.
- Datos de prueba: quedan cuentas de prueba (tester@, lena…@, e2e…@example.com) en la base `my_gdd` **local** del Mac (no en Atlas).

---

## Pendiente

- ~~Subir a GitHub los commits del front~~ hecho.
- ~~Servicio en Render~~ hecho 2026-11-24 (ver abajo).
- Detalles de animación simplificados (desintegración en cuadrados, reordenar arrastrando) y escenas sin marco F5 (fecha de revisión, calendario, hora).
- Avisos de Sass por `@import` (no afectan al funcionamiento).
- **Desde 2026-11-24 la lista al día de lo pendiente está en «Propuestas tras la revisión»** (más abajo): ahí se marcan los puntos hechos.

**GitHub**
- Push aprobado por el usuario: `9d815f1..e51342b` → `origin/main`. Comprobado con `git ls-remote`.

**Pausa**
- El usuario para hasta mañana. Creado `RETOMAR.md` con el prompt para retomar, la guía completa de Render y cómo arrancar la app en el Mac.

## 2026-11-24

**Render · primer deploy fallido**
- Log: `sh: 1: ng: not found`. Causa: con `NODE_ENV=production`, `npm ci` omite las `devDependencies` (ahí están `@angular/cli` y `@nestjs/cli`); solo instaló 21 paquetes.
- Arreglo: `npm ci --include=dev` en el script `build` de la raíz. Probado en el Mac con `NODE_ENV=production npm run build`: compila web (`app/www`) y API (`api/dist`).

**Render · en línea**
- Segundo deploy correcto. Dirección pública: https://my-gdd.onrender.com
- Comprobado con `curl` (todo bien): web en `/` y `/home` (200); `/api/me` sin token → 401; signup → 201; email repetido → 409; guardar un GDD → 200; login nuevo y leer → el GDD está (guardado en Atlas, base `my_gdd`); contraseña mala → 401; borrar cuenta → 200; login tras borrar → 401. La cuenta de prueba (`render-check-…@example.com`) quedó borrada.
- No verificado aún: prueba en el navegador por el usuario y ver la base en Atlas (*Browse Collections*).

**Revisión completa de la app publicada (a petición del usuario: «revisa que todo esté bien»)**
- Prueba en el navegador contra https://my-gdd.onrender.com (Playwright, 390 × 844, cuentas de prueba borradas al acabar): 24 pantallas por dirección directa y recorridos con dos cuentas (crear GDD, escribir y guardar un bloque, recargar, invitar, enviar y recibir notas, borrar GDD, cerrar sesión y entrar, cuenta borrada con la pestaña abierta → vuelve a «Log in»). **Ningún error de JavaScript ni de red.**
- Fallos encontrados:
  1. Fechas fijas: «Created today», «Updated today», «Edited just now» y «Just now» se guardaban como texto y no cambiaban nunca.
  2. «Member since October 2026» escrito a mano para todas las cuentas.
  3. Nota del equipo recibida: «Just now · Ana, Ana» (nombre repetido).
  4. Botones que decían hacer algo que no hacían: «Download my data», «Send feedback», «Log out of other devices».
  5. Cambiar la contraseña no cerraba las sesiones abiertas en otros aparatos.
  6. Sin límite de intentos en Log in / Sign up.
- Arreglado (decisiones de esta sesión, sin cambiar el diseño):
  - Fechas reales: `cts`/`uts` en cada GDD y `ts` en «Continue writing»; nuevo `data/time.ts` («just now», «5 min ago», «3 h ago», «yesterday», «4 days ago», «on 12 Nov»). La hora de la app avanza sola cada minuto (`store.now`). Los datos de ejemplo de `/scenes` conservan sus textos.
  - «Member since» = mes y año de alta (`since` en `GET /api/me`).
  - Nota del equipo: «Just now · Ana».
  - «Download my data» descarga `my-gdd-data-AAAA-MM-DD.json` (perfil, ajustes, equipo, GDDs y notas; sin contraseña).
  - «Send feedback» se guarda en la colección `feedback` de Atlas.
  - «Log out of other devices» y cambiar la contraseña invalidan los tokens de los demás aparatos (versión de sesión `tv`).
  - Límite de 10 intentos por minuto e IP en `/api/auth/*` (429 «Too many attempts. Wait a minute and try again.»).
- Probado en el Mac en modo producción (`NODE_ENV=production npm run build` + `npm start`, puerto 3100): API con `curl` (since, cts/uts, feedback y feedback vacío → 400, tokens antiguos → 401 tras logout-others y tras cambiar la contraseña, 10 intentos → 429, cuenta borrada → 401) y navegador (11 comprobaciones, todas bien; con el reloj adelantado 2 días: «Updated 2 days ago», «edited 2 days ago», notas «2 days ago»).
- Conocido y anterior a esto: `npm run lint` en `app/` falla en el paso de Prettier (20 archivos con formato distinto); ESLint y tipos, sin errores. No se reformatea para no mezclar 20 archivos en este cambio.
- En línea (Render), todo lo anterior comprobado de nuevo en el navegador: 11/11 bien. **Pero el límite de intentos no saltaba**: 11 intentos → todos 401. Render está detrás de Cloudflare y de varios proxies, y `req.ip` cambia en cada petición. Arreglo: `api/src/auth/ip-throttler.guard.ts` cuenta por `CF-Connecting-IP` (Cloudflare pone la IP real y sustituye la que mande el visitante); se quita `trust proxy`. Probado en el Mac simulando la cabecera: el visitante 1 llega a 429 en el intento 11; el visitante 2 sigue pudiendo entrar.
- En línea tras el deploy de `056c890`: 10 intentos fallidos → 401; el 11.º y siguientes → 429. Comprobado dos veces. Una cabecera `CF-Connecting-IP` falsa la bloquea Cloudflare (403). Durante el deploy hubo respuestas mezcladas (conviven la versión vieja y la nueva unos minutos).

## Propuestas tras la revisión (2026-11-24, pendientes de decisión del usuario)

1. **«Out of date» no ocurre nunca con datos reales.** Es la promesa principal de la app («up to date»), pero los avisos de cambio (`kind: 'change'`) solo existen en los datos de ejemplo; ni el prototipo dice qué los provoca. Propuesta: al guardar un bloque con cambios, avisar a los bloques relacionados (hay que decidir qué es «relacionado»: el mismo departamento, una lista de dependencias que elige el usuario…).
2. ✅ **Hecho 2026-11-24** (ver «Puntos 2 y 3»). ~~**El equipo no comparte los GDDs.** «My team» dice «People who can see your GDDs», pero las otras cuentas no ven nada; solo reciben notas. Propuesta: GDDs compartidos con los roles Editor / Viewer (cambio grande en la API).~~
3. ✅ **Hecho 2026-11-24.** ~~**Notas a cualquiera.** Basta con escribir un email en «Invite member» para que esa cuenta reciba tus notas, sin aceptar nada. Propuesta: que la invitación se acepte antes de recibir notas (va junto con el punto 2).~~
4. **Correo real** (contraseña olvidada, invitaciones, confirmar el cambio de email): necesita un servicio de correo (p. ej. Resend o Brevo, con plan gratis) y una cuenta del usuario. Hoy esas pantallas dicen «We sent…» sin enviar nada.
5. **Verificación en dos pasos:** el interruptor no hace nada (no se guarda). Quitarlo o hacerlo real (va con el correo).
6. **Idiomas:** se puede elegir, pero la app solo está en inglés (lo avisa). **Color de acento:** se elige pero no cambia la paleta.
7. **Detalles de animación** ya anotados: desintegración en cuadrados al borrar y reordenar arrastrando.
8. **Render gratis se duerme:** la primera visita tras 15 min tarda ~1 min. Opciones: plan de pago (~7 $/mes) o aceptar la espera.
9. **Formato:** `npm run lint` de `app/` falla solo por Prettier (20 archivos). Arreglarlo es `npx prettier --write` en un commit aparte, sin cambios de código.

**Puntos 2 y 3: GDDs compartidos con el equipo e invitaciones que se aceptan (a petición del usuario)**

| Fecha | Decisión | Por qué |
|---|---|---|
| 2026-11-24 | Un equipo **por cuenta**: quien acepta ve **todos** los GDDs de esa cuenta. | Es lo que ya dice el diseño («People who can see your GDDs and get your notes»). |
| 2026-11-24 | **Editor**: escribe y crea/renombra/mueve/borra departamentos y bloques; no renombra, ordena ni borra el GDD. **Viewer**: solo lee y envía notas. | Textos del diseño («Editor: can write blocks… Viewer: can read the GDD and send notes»); el GDD en sí es del dueño. |
| 2026-11-24 | La invitación se acepta **dentro de la app** (Notes › Received y My team), sin correo. Hasta aceptar no se ve nada ni se reciben notas. | No hay servicio de correo; así se arregla el punto 3 (notas a cualquiera). |
| 2026-11-24 | Choques entre dos personas: versión `rev` por GDD + unión de cambios en el front (lo que cambió cada una se queda; en la misma sección gana la última). Refresco cada 30 s y al volver a la pestaña. | Un GDD se guarda entero: sin esto, el último en guardar borraría lo del otro. |
| 2026-11-24 | Pantallas nuevas sin marco en el diseño: tarjeta de invitación (Notes y My team), «Teams you’re in» con *Leave*, aviso «Shared by … · You can read this block» en el editor del Viewer, menú del GDD compartido con «Leave …’s team», texto de la hoja «Invite a member» y «Waiting for them to accept». | Hacían falta para el flujo; con los componentes del sistema de diseño (lista, botones, banner-warn, hoja). |

- Servidor: `api/src/data/team.ts` (reglas puras: `cleanTeam`, `roleIn`, `recipients`) + `team.spec.ts` (7 pruebas, Vitest). `data.controller.ts` reescrito: `GET /api/me` con GDDs compartidos, `invitations` y `teams`; `TeamsController` (`accept`, `decline`, `leave`); permisos y `rev` en `PUT /api/gdds/:id` (409 con el GDD actual); notas al equipo del GDD; al cambiar nombre/email se actualiza en los equipos donde estás; al borrar la cuenta sale de los equipos.
- Front: `data/merge.ts` + `merge.spec.ts` (6 pruebas); `StoreService` con `role()`/`canEdit()`, avisos de solo lectura, guardado con versiones y unión, `refresh()`, `answerInvite()`, `leaveTeam()`; en Home «Shared by Ana · Editor»; modo solo lectura en departamentos, bloques y editor; invitaciones en Notes (cuentan en el aviso de la barra) y en My team; menú del GDD compartido; una nota sin GDD accesible ya no abre `/gdd/null`.
- Probado en el Mac (modo producción): API con 3 cuentas, **24/24** comprobaciones (invitar, sin acceso ni notas antes de aceptar, aceptar, roles, Editor escribe pero no renombra, 409 con la versión de la otra persona, Viewer 403, nadie más borra, nota del Viewer al equipo, quitar miembro, cambiar nombre, salir, rechazar, borrar cuenta). Navegador con 3 cuentas, **11/11** (incluido un choque real: 409 → «Someone in your team changed this GDD too. Both changes were kept.» y los dos textos en el servidor; Ana ve el texto de Bea sin recargar). La prueba general anterior, 11/11.
- En línea (`41313b5`): API 24/24 bien. Navegador: 10/11; **falló una vez** «Bea sale del equipo» (el GDD seguía en su Home). Causa encontrada: una **carrera** — si el refresco automático (`refresh()`) pidió `/api/me` justo antes de salir, su respuesta (vieja, con el GDD) llegaba después y se pintaba encima. Lo mismo podía hacer «desaparecer» un momento un cambio recién guardado. Reproducido a propósito (retrasando esa respuesta 1,5 s): con la versión publicada el GDD vuelve a salir; con el arreglo, no. Arreglo: contador `gen` en `StoreService` (sube al cambiar datos, guardar o recargar); un refresco solo se aplica si `gen` no cambió mientras esperaba. En el Mac, la prueba de 3 cuentas dos veces: 11/11 y 11/11.
- En línea (`4a6eded`): la carrera forzada ya no ocurre; prueba de 3 cuentas **11/11**. Cuentas de prueba borradas.
- Nota: los scripts de las pruebas de hoy (Playwright y Python) se escribieron en una carpeta temporal de la sesión, **no están en el repositorio**; lo que comprobaban está descrito arriba.

**Pruebas guardadas en el proyecto (a petición del usuario: «Vale»)**
- Las pruebas de hoy pasan de la carpeta temporal al proyecto, en TypeScript con el Playwright que ya traía `app/`: `app/e2e/helpers.ts`, `api-team.spec.ts` (5), `general.spec.ts` (8) y `team.spec.ts` (8). Se borra `app/e2e/app.spec.ts`, la prueba de la plantilla de Ionic («Ready to create an app?»), que ya no valía. `app/playwright.config.ts`: `BASE_URL` para probar la app publicada; si no, arranca `npm start` de la raíz (puerto 3000); un solo worker (límite de 10 Sign up / Log in por minuto; si salta el 429, la prueba espera y repite). Cómo usarlas: sección «Pruebas» de `CLAUDE.md`.
- Al pasarlas salió un **riesgo real**: recargar o cerrar la pestaña justo después de escribir (antes de los 0,4 s en que la app guarda) perdía el cambio. Arreglo en `StoreService`: al salir de la pestaña guarda ya lo pendiente, y al cerrar o recargar con algo sin guardar el navegador pregunta antes (`beforeunload`).
- En el Mac: **21/21** dos veces seguidas; unitarias 6/6 (app) y 7/7 (api); ESLint y tipos sin errores.
- Contra la app publicada (`7fcd390`): `BASE_URL=https://my-gdd.onrender.com npm run test:e2e` → **21/21** (54 s). Cuentas de prueba borradas.

**Nuevo encargo y roadmap (a petición del usuario)**
- El usuario envía una lista: correo real (verificación al registrarse, cambio de contraseña, invitaciones), borrar la cuenta desde el perfil, invitar a proyectos concretos con roles por departamento, idiomas (catalán, español, japonés), color de acento, animaciones que faltan y una propuesta para «Out of date». Pide un roadmap: él irá enviando las secciones.
- Creado **`ROADMAP.md`** (secciones 1–7 con estado, dudas y pasos). Comprobaciones hechas antes de escribirlo:
  - **Borrar la cuenta ya existe** (*Profile › Personal info › Delete account*); probado por API y en las pruebas e2e. Duda: ¿acceso directo también en *Profile*?
  - **El color de acento no funciona:** se guarda, pero la app siempre usa la paleta azul. El diseño lo aplaza («The accent color arrives with the color palette»), y `tokens.json` solo trae la paleta azul.
  - **Animaciones que faltan** (README del sistema + prototipo): desintegración en cuadrados (hoy se encoge y se desvanece), reconstrucción al deshacer, reordenar arrastrando con pulsación larga y arranque de la app (splash). La aparición «palomitas» sí existe.
  - **Idiomas:** unos 300 textos en la interfaz; el japonés necesita la fuente Noto Sans JP. Es abarcable (sección 6).
- **Propuestas para «Out of date»** (pendiente de elegir):
  - **A (recomendada):** «Note a change» con la elección de los bloques afectados; esos pasan a «Out of date» para todo el equipo hasta que alguien los revisa. Usa lo que ya existe (`aff`, `rvd`, `pend`, la pantalla de revisión) y sigue la guía del diseño («When the game changes, send a quick note… Review the blocks that are out of date»).
  - **B:** dependencias entre bloques («Depends on»); al guardar uno, se marcan los que dependen de él.
  - **C:** automático por la cadena de producción (departamentos posteriores); es fácil, pero ruidoso.
  - Extra para A: el aviso «Saved» ofrece «Note a change».
- Orden recomendado: 1 Out of date → 2 proyectos y roles → 3 correo → 4 acento → 5 animaciones → 6 idiomas → 7 pequeños.

**Decisiones del usuario sobre el roadmap (2026-11-24)** — se hacen en el orden recomendado (1 → 7):
- 1 «Out of date»: **propuesta A** (Note a change marca los bloques afectados + aviso «Saved» con «Note a change»).
- 2 Proyectos y roles: **sí a todo** (GDDs al invitar y en *Manage*; Viewer / Editor / Editor de departamentos; notas a un departamento solo a quien lo tiene).
- 3 Correo: **Brevo**; se entra sin verificar con aviso, pero sin invitar ni aceptar invitaciones hasta verificar.
- 4 Acento: solo botones, enlaces y selección.
- 6 Idiomas: **solo catalán y castellano** por ahora.
- 7.1 Borrar cuenta: **sin acceso directo** en *Profile* (ya está en *Personal info*).

**Roadmap 1 · «Out of date» (propuesta A)**
- *New note*: nueva sección plegable «Blocks affected by this change», con casillas por departamento; no sale el bloque de la nota. Al enviar: «Note sent · N blocks marked out of date», y en *Sent* la nota lo indica.
- Servidor: si la nota enviada lleva `aff`, marca esos bloques en el GDD (`pend`, `status: 'Out of date'`, `rev` +1; reintenta si otra persona guarda a la vez) y entrega a los demás un aviso `kind: 'change'` (título = la nota, ruta = «Departamento › Bloque» de origen), que abre *Review*. Sin `aff`, sigue siendo una nota del equipo normal. Función pura `markOutOfDate` en `team.ts`, con prueba.
- *Review*: un bloque cuenta como revisado cuando ya no está pendiente en el GDD (igual para todo el equipo), no solo según la nota de cada uno.
- Editor: el aviso «Saved» lleva la acción «Note a change», que abre *New note* con ese bloque.
- Quien envía ve los bloques marcados al momento: tras guardar la nota, la app trae el GDD nuevo (`refreshAfterSync`).
- **Decisión (Claude):** cualquiera del equipo, también un Viewer, puede marcar bloques al enviar una nota (las notas son para todos), pero solo quien puede editar los revisa.
- Pruebas: `app/e2e/outdated.spec.ts` (5: Saved → Note a change → marcar 2 → Out of date para todos y en Home → Bea revisa uno en Review → a Ana le queda 1 → el Viewer marca, pero no revisa); `team.spec.ts` (api) 8/8. Todas las e2e en el Mac: **26/26**.
- Roadmap 1 en línea (`bc25059`): `outdated.spec.ts` **5/5** contra https://my-gdd.onrender.com.

**Roadmap 2 · Proyectos y roles por departamento**
- Servidor (`team.ts`): `grants` por persona (`{ g, role, depts }`), `cleanGrants`, `accessIn` (acceso a un GDD concreto), `recipients` (por GDD y por departamento), `deptEditAllowed` (comparación estable de JSON con `stable()`). `cleanTeam` admite `grants` solo de GDDs del dueño y resume el rol de la lista (Editor si lo es en algún proyecto). Pruebas: 12/12.
- `data.controller.ts`: `GET /api/me` da solo los GDDs con acceso (con `share.depts`) y las invitaciones con `projects` (nombres); `PUT /api/gdds/:id` comprueba el acceso a ese GDD y, si es Editor de departamentos, `deptEditAllowed` (403 si no); al aceptar, la persona entra con los `grants` de la invitación; notas con `toDept`.
- Front: `GrantsComponent` en las hojas *Invite a member* y *Manage* (casillas de proyectos; en cada uno, Editor/Viewer y chips de departamentos; por defecto todos los proyectos como Editor; aviso si no hay ninguno). Lista del equipo: «Editor · 1 of 2 projects». Invitación: «Project: Juego 1». Home: «Shared by Ana · Editor (Art)». Departamentos: «You can edit: Art.». Permisos en `StoreService`: `canEditDept`, `canManageDepts`, `deny()` con avisos «You can only edit your departments.» / «Only editors of the whole GDD can change its departments.».
- **Decisiones (Claude):** un Editor de departamentos puede añadir, borrar, renombrar y ordenar los **bloques** de sus departamentos, pero no tocar la lista de departamentos. Un Viewer también puede tener departamentos (solo para recibir las notas a ese departamento). Quien ya estaba en un equipo (sin `grants`) sigue viendo todos los GDDs hasta que el dueño le cambie el acceso. Un GDD nuevo no se comparte solo con quien tiene `grants`: hay que añadirlo en *Manage*.
- Pruebas: `app/e2e/projects.spec.ts` (6, con 4 cuentas: invitar a un proyecto con Art; aceptar y ver solo ese GDD; escribir en Art y solo leer Audio; el servidor rechaza Audio y renombrar departamentos; *Manage* añade el Juego 2 como Viewer; nota a «Audio» → la reciben la dueña y Cris (Audio), Dani no). Todo en el Mac: e2e **32/32**, unitarias 6/6 (app) y 12/12 (api).
- Roadmap 2 en línea (`1baad56`): todas las e2e **32/32** contra https://my-gdd.onrender.com.

**Roadmap 3 · Correo con Brevo**
- Servidor: `api/src/mail/mail.service.ts` (envío por la API HTTP de Brevo con `fetch`, sin librerías; modos `brevo` / `outbox` / `off`; enlaces de un solo uso con sha256 en la colección `tokens`, con TTL) y `templates.ts` (5 correos en inglés, texto + HTML). `DevController`: `GET /api/dev/outbox` solo en modo outbox. Rutas nuevas: `POST /api/auth/verify|forgot|reset`, `POST /api/me/email`, `POST /api/me/verify/resend`, `POST /api/me/team/resend`. Correo de bienvenida al registrarse, aviso al cambiar la contraseña, invitación al guardar una invitación nueva. Sin verificar (con correo activo): 403 al invitar y al aceptar. `User.emailVerified`.
- Front: pantallas nuevas **/verify** (enlace de los correos: «Email verified» / «New email confirmed» / «This link doesn’t work») y **/reset** (contraseña nueva); «Forgot password?», «Send the link again», «Forgot your current password?» y «Resend invitation» reales; aviso «Verify your email» con «Send link» en Home, Notes (si hay invitaciones) y My team (`VerifyBannerComponent`); invitar o aceptar sin verificar → aviso con «Send link»; cambiar el email en *Edit profile* manda la confirmación y *Personal info* muestra «Waiting for you to confirm …».
- **Decisiones (Claude):**
  - **Sin clave en Render (`off`), la app sigue como antes** y no pide verificar. Así no se bloquea nada hasta que el usuario active Brevo.
  - **Nunca se envía a `@example.com`.** Así las pruebas no generan rebotes, que penalizarían la cuenta de Brevo.
  - **El enlace de contraseña nueva o de email nuevo también verifica el email,** porque llegó a ese buzón.
  - **`APP_URL` sale de una variable,** no de la petición: así no se puede falsear el Host.
  - **«Forgot password» responde igual exista o no la cuenta,** para no revelar qué cuentas hay.
- Pruebas: `app/e2e/mail.spec.ts` (8, solo en el Mac); las pruebas que invitan verifican sus cuentas con el outbox (`helpers.ts`) y se saltan si no pueden. En el Mac: e2e **40/40**, unitarias 6/6 (app) y 12/12 (api).
- **Pendiente del usuario:** activar Brevo (pasos en `ROADMAP.md`, sección 3). Hasta entonces, en línea el correo está apagado.
- Roadmap 3 en línea (`41d3fc7`): la ejecución contra la app publicada **no vale**. Corrió a la vez que las pruebas del Mac, en la misma carpeta, y cogió archivos a medio hacer (la prueba del acento, sin publicar, y un script de capturas), además de chocar en `test-results`. Se repite tras publicar el 4. Aprendido: no lanzar las pruebas publicadas mientras se trabaja en `app/e2e`.

**Roadmap 4 · Color de acento**
- `scripts/build-accents.mjs` (`npm run accents`, también dentro de `npm run tokens`) genera `src/theme/accents.css` con `@material/material-color-utilities` **0.3.0** (la 0.4 no carga en Node: importa archivos sin extensión). `SchemeFidelity` (contraste 0 / 1) reproduce **exactamente** los tokens del diseño con la semilla azul `#3F48CC` en los 4 temas, y el script lo comprueba siempre. Semillas: Green `#1E7A3C`, Orange `#E8603C`, Purple `#7B4FC9`, Grey `#78767D` (las de los círculos de *Edit profile*).
- Familias: **primary** (botones, FAB, enlaces, foco, banda de la tarjeta en claro) y **secondary** (pestaña activa de la barra, botones segmentados, chips marcados, banda en oscuro). La secondary se añadió tras ver las capturas: con solo la primary, la selección seguía azul. Contraste AA comprobado en los 32 casos (4 acentos × 4 temas × botón/enlace/contenedor/selección; mínimo 4,5).
- Front: clase `accent-<color>` en `<html>` desde `StoreService`; en *Edit profile*, tocar un color lo enseña al momento (`previewAccent`) y, al salir sin guardar, vuelve el anterior. Texto de ayuda: «Changes buttons, links and selection. Tap Save to keep it.» (antes: «More accent colors arrive…»).
- Prueba `app/e2e/accent.spec.ts` (3). Capturas revisadas: Green, Orange, Purple y Grey en claro y oscuro. En el Mac: e2e **43/43**.
- Roadmaps 3 y 4 en línea (`7eb06ea`): `BASE_URL=https://my-gdd.onrender.com npm run test:e2e` → **35 pasan, 8 saltadas** (las de `mail.spec.ts`: en línea no hay outbox, y el correo está apagado hasta activar Brevo).

**Roadmap 5 · Animaciones**
- Fuente: README del sistema de diseño (tabla de movimiento) y el código del prototipo (`App.dc.html`: `_sqs`, `_tiles`, `_dragStart…_dragUp`, `#app-splash`, keyframes `mvpop`/`mvlap`/`mvspi`, constantes `MV_E` y `MV_DISP`). Se trasladan con los mismos valores.
- 5.1 / 5.2 **Desintegración y reconstrucción** (`TilesDirective`): 8 cuadrados (4 × 2) con el color, el borde y la banda de la tarjeta (la banda se mide: arriba en bloques y GDDs, a la izquierda en departamentos). Salen 300 ms con 40 ms de desfase por columna, primero los de la derecha (≈ 420 ms). Con *Undo* vuelven 350 ms tras 150 ms, primero los de la izquierda. En bloques, departamentos y tarjetas de Home (el GDD no tiene Undo). Sustituye al «se encoge y se desvanece» de antes.
- **FLIP** (`motion.ts`, `data-flip`): al borrar o deshacer, las tarjetas vecinas se deslizan a su sitio (300 ms, ease-standard). También en las filas de Notes y My team.
- 5.3 **Reordenar arrastrando** (`ReorderDirective`): pulsación larga de 400 ms, levantar (150 ms, escala 1,06, borde primary), vecinos que se apartan (200 ms), hueco que marca el destino, scroll automático cerca de los bordes y soltar con rebote (250 ms). Si se mueve más de 10 px antes de los 400 ms, es un scroll. El clic al soltar no abre la tarjeta. En bloques y departamentos, solo con permiso y sin búsqueda activa. Aviso «X moved to position N of M». *Move up/down* sigue en el menú (teclado y lectores de pantalla).
- 5.4 **Arranque** (`SplashComponent`): el coral y las cuatro teclas saltan y forman un anillo que da una vuelta (1 s) y luego se funde (150 ms). **Decisiones (Claude):** una vez por sesión del navegador (no en cada recarga); nunca con «menos movimiento» (del sistema o de la cuenta, que se recuerda en `localStorage`); deja pasar los toques; no sale en `/scenes`.
- **Fallo encontrado y arreglado** (gracias a las capturas): *Undo* devolvía la versión (`rev`) vieja del GDD; el servidor respondía 409 y salía «Someone in your team changed this GDD too» sin que nadie más editara (no se perdía nada). Ahora *Undo* conserva la versión actual. La prueba cuenta que no haya ningún 409.
- 5.5 Repaso: las demás animaciones del README (pulsar, hojas, diálogos, pestañas, cambio de pantalla, snackbar, aparición «palomitas») ya estaban desde la fase del front; esta vez **no** se han comparado una a una con cada marco `Mov-*`.
- Prueba `app/e2e/animations.spec.ts` (5); fotogramas en lento ×4 revisados (arranque, desintegración, reconstrucción, arrastre en bloques y departamentos). En el Mac: e2e **48/48**.
- Roadmap 5 en línea (`04a6764`): **40 pasan, 8 saltadas** (correo).

**Roadmap 6 · Idiomas** ✅ 2026-11-25 · publicado (`ac3d1f5`)
- Hecho: `app/src/app/i18n/` (`i18n.ts`: `t()`, `tn()`, pipe `| t`, `lang`, `applyLang`, registro `__i18nMissing`; idioma inicial = último elegido en el navegador o el del navegador; luego el de la cuenta). Diccionarios `es.ts` y `ca.ts` (576 claves) generados con `app/scripts/i18n-data.py` (**editar allí** y volver a ejecutarlo). `npm run i18n:check` (`scripts/check-i18n.mjs`, también dentro de `npm run lint`): es y ca completos. Plantillas envueltas con `scripts/i18n-wrap.py` (ayuda de una sola vez) y repaso manual de expresiones y TypeScript (avisos, estados, fechas, mensajes del servidor, diálogos, catálogo de plantillas: los GDDs nuevos se crean en el idioma de la app). Lista de idiomas: inglés, español y catalán; el resto, «Coming soon» (no se eligen).
- Pruebas `app/e2e/i18n.spec.ts`: 5/6 bien en el Mac (cambio de idioma, toda la app en español y en catalán sin claves sin traducir ni textos en inglés, fechas, plantilla en español, mensajes del servidor). **Falla la 6.ª** («idiomas sin traducción… el acceso recuerda el idioma»): se queda esperando un clic 2 min; sin investigar aún.
- **Al retomar:** (1) investigar y arreglar la prueba 6; (2) pasar todas las e2e en el Mac; (3) revisar capturas en es/ca (textos largos en botones); (4) fusionar `wip/idiomas` en `main`, publicar y probar en línea; (5) marcar ✅ en `ROADMAP.md`. Después: sección 7 (pequeños pendientes) y, cuando el usuario lo active, Brevo (sección 3).
- Correos: siguen en inglés (decisión pendiente de comentar con el usuario).
- **2026-11-25:** (1) prueba 6 arreglada: la opción «Deutsch» lleva `aria-disabled` y Playwright espera a que se habilite antes de pulsar → `click({ force: true })` (la app sí responde al toque con «… encara no està disponible»). (2) En el Mac: e2e **54/54**, unitarias 6/6 (app) y 12/12 (api), ESLint, typecheck e2e e `i18n:check` bien. Prettier ya fallaba en `main` (37 archivos), no se toca aquí. (3) Capturas de 26 pantallas en es y ca con detección automática de textos cortados o fuera de pantalla: ninguno. Visto a ojo: en *Mi equipo* quedaba «Ana (you)» y «Owner» en inglés (palabras sueltas, el filtro de frases no las ve) → clave nueva `{name} (you)` (577 claves) y rol con `| t`; la prueba «toda la app en español» lo comprueba.
- **Decisión del usuario (2026-11-25):** los correos se quedan en inglés.
- Roadmap 6 en línea (`ac3d1f5`, `wip/idiomas` fusionada en `main` sin conflicto): **46 pasan, 8 saltadas** (correo).
- **Siguiente:** sección 7 (pequeños pendientes) y, cuando el usuario lo active, Brevo (sección 3).

**Roadmap 7 · Pequeños pendientes** (2026-11-25)
- **Decisiones del usuario:** 7.2 hacer real la verificación en dos pasos con código por correo; 7.4 quedarse con Render gratis. 7.1 ya estaba hecho.
- 7.3 Prettier en `app/` en un commit aparte (40 archivos, solo formato). Prettier también reformateaba `i18n/es.ts` y `ca.ts` y rompía `i18n:check` (lee esos archivos línea a línea) → van en `.prettierignore` (los genera `i18n-data.py`). Comprobado: lint, unitarias, e2e 54/54 y capturas es/ca iguales a las de antes (solo cambia el email de la cuenta de prueba).
- 7.2 Dos pasos: servidor (`User.twoStep`, `User.devices`; `MailService.newCode/useCode`; `codeMail`; `POST /api/auth/login/code`; `PATCH /api/me/two-step`; `auth/devices.ts`), front (paso del código en *Log in*, interruptor real, `ApiService.device`) y 13 textos nuevos en es/ca (589 claves). Detalles en `CLAUDE.md`.
- **Decisiones (Claude):** «aparato nuevo» = navegador sin el identificador guardado (no se borra al cerrar sesión); el código va en el asunto del correo (se ve en la notificación); tras 5 fallos el código se anula; «Send a new code» repite el inicio de sesión (anula el anterior); con el correo apagado no se pide código (si no, nadie podría entrar) y el interruptor no se puede activar; «Log out of other devices» y la contraseña nueva por enlace olvidan los aparatos de confianza; correo en inglés, como los demás.
- **Fallo encontrado y arreglado:** si el servidor no dejaba activarlo, el interruptor se quedaba encendido en pantalla (el valor iba de false a true y otra vez a false antes de que Angular lo pintara) → la vuelta atrás espera un instante (`setTimeout`).
- Prueba `app/e2e/twostep.spec.ts` (6, solo en el Mac). Capturas en catalán del paso del código y del interruptor revisadas. En el Mac: e2e **60/60**, unitarias 6/6 (app) y 12/12 (api), lint bien.
