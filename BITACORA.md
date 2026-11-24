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
