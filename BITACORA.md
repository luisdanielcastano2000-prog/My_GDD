# Bitácora · My GDD

Registro de lo que hemos hecho y de las decisiones tomadas, para no perder contexto entre sesiones.
Cómo arrancar y cómo está organizado el proyecto: `CLAUDE.md`. Aquí va **lo que ha pasado de verdad**.

---

## Estado actual (actualizado 2026-11-23)

- **Hecho:** copia local del diseño (`design/`), repositorio en GitHub y front completo en Ionic + Angular (`app/`) con las 56 pantallas del lienzo, revisadas en el navegador.
- **Datos:** de ejemplo, **en memoria** (se pierden al recargar). Todavía no hay backend ni base de datos.
- **Siguiente:** backend + base de datos MongoDB + publicación en Render (plan pendiente de aprobación).
- **Procesos corriendo:** el servidor de desarrollo del front (`npx ionic serve`, puerto 8100) lo arrancó Claude; se apaga al cerrar la sesión.
- **Control de versiones:** Git, rama `main`, remoto `origin` = GitHub `luisdanielcastano2000-prog/My_GDD` (**público**). Los commits del front (`66252dd`, `81e4b2b`, `3c902ce`) son **locales, sin subir**.

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
- Creado este archivo a petición del usuario.

---

## Pendiente

- Subir a GitHub los commits del front (falta el OK del usuario).
- Backend + MongoDB + Render (plan por aprobar).
- Detalles de animación simplificados (desintegración en cuadrados, reordenar arrastrando) y escenas sin marco F5 (fecha de revisión, calendario, hora).
- Avisos de Sass por `@import` (no afectan al funcionamiento).
