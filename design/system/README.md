# My GDD

Your GDD, structured and up to date.

My GDD es una app móvil para escribir el GDD (el documento de diseño de un videojuego) por bloques y mantenerlo al día cuando el juego cambia. La persona principal es Noa, desarrolladora indie a la que le cuesta estructurar el documento y saber qué partes se han quedado viejas.

Este sistema recoge lo que usa el prototipo funcional y el wireframe: Material Design 3 Expressive con la paleta definitiva del equipo (índigo #3F48CC sobre neutros grises, más amarillo de aviso y verde de éxito). La fuente del color es `Paleta_color_MyGDD.md` en el proyecto del equipo.

## Principios

- **Claro antes que bonito.** Cada pantalla tiene un título, una acción principal y textos cortos. Si algo necesita explicación, va en una línea de ayuda (`body-small`), no en un párrafo.
- **Formas redondas, nunca afiladas.** Las esquinas salen de la escala de forma de M3 Expressive (`corner-large` en tarjetas de departamento y de bloque, `corner-extra-large` en dialogs, sheets y tarjetas de proyecto, `corner-full` en botones).
- **Una acción principal por pantalla.** Un botón filled (`primary`) o un FAB (`primary-container`), nunca los dos compitiendo.
- **Lo que actúa sobre una caja vive dentro de ella.** El menú ⋮ (Rename, Move, Delete) va dentro de la tarjeta del proyecto, del departamento o del bloque. Las tarjetas no llevan lápiz de renombrar.
- **Lo que se puede deshacer no se confirma.** Borrar un bloque, una nota o un recordatorio enseña un snackbar con Undo. Borrar un proyecto, un departamento o la cuenta pide confirmación en un dialog.
- **Lo desactualizado se ve y se alcanza.** El estado «Out of date» siempre lleva el símbolo `!`, y el chip «N out of date» abre la lista filtrada.

## Voz y textos

- La interfaz está en inglés; la documentación del equipo, en castellano.
- Frases cortas en sentence case: «Set review date», «Not sure what to write? Get help».
- Los botones dicen lo que hacen con un verbo: «Create GDD», «Send note», «Mark as reviewed».
- Los errores dicen cómo arreglarlo: «Enter an email address, for example name@example.com.»
- Datos de ejemplo inventados (Hollow Tides, Pixel Kitchen, Noa, Marc, Lena). Nunca datos de personas reales.

## Marca

**Icono.** Cruceta de cuatro teclas cuadradas separadas y una tecla central coral, sobre índigo (`primary-container`, #3F48CC). Cada tecla tiene un borde y un lateral índigo oscuro (#232BB4); la central, en `marca-coral-oscuro`. Nombre interno: R11-4 · Tecla.

**Logo.** El icono y el nombre «My **GDD**» en Roboto: «My» en 400 y «GDD» en 700, en dos palabras. Termina en un punto cuadrado que repite la forma de las teclas: mide unas 0,17 veces el tamaño de la letra y se apoya en la línea base.

| Fondo | Nombre | Punto |
| --- | --- | --- |
| Oscuro o índigo | #FDF8F9 | `marca-coral` (#FF8E6E) |
| Claro | #1C1B26 | `marca-coral-oscuro` (#E8603C) |

Versiones: horizontal (icono + nombre), vertical, solo el nombre y solo el icono. Los archivos están en el grupo de assets «Logos». El texto de los archivos del logo está convertido en trazos.

- El coral es solo de marca: nunca se usa para estados ni para acciones.
- En la interfaz (top app bar e inicio de sesión), el nombre se escribe igual que en el logo, con el color de texto `on-surface`.
- Icono adaptativo de Android: capas de 108 dp con el dibujo dentro de la zona segura de 66 dp. En los temas del sistema solo queda la silueta de las cinco teclas.
- El arranque de Android 12 o posterior lo dibuja el sistema: el icono recortado en un círculo, sin el nombre.

## Movimiento

El movimiento informa, no decora: confirma una acción, explica un cambio de estado u orienta en la navegación.

1. **Rápido.** Las acciones frecuentes duran menos de 300 ms; nadie espera a una animación.
2. **Coherente.** El mismo tipo de movimiento usa los mismos tiempos y curvas. Lo que entra usa `ease-decelerate`; lo que sale, `ease-accelerate` y es más corto que la entrada.
3. **El movimiento refuerza, no sustituye.** Ningún estado depende solo del movimiento o de la vibración: siempre hay icono, color y texto accesible.
4. **Reducir movimiento.** Si el sistema lo pide, se eliminan saltos, giros, rebotes, partículas y paralaje, y se sustituyen por un cambio de opacidad de 150 ms o menos.
5. **Tres animaciones con personalidad, todas con los bloques de la marca:** aparición de bloque («palomitas»), eliminación de bloque (desintegración en cuadrados) y arranque de la app. El resto es sobrio.

| Token | Valor | Uso |
| --- | --- | --- |
| `dur-press` | 120 ms | Pulsar y soltar un botón |
| `dur-short` | 250 ms | Expandir FAB, interruptor, cambios pequeños |
| `dur-medium` | 300 ms | Pestañas, cierre de elementos de lista |
| `dur-sheet` | 350 ms | Entrada del bottom sheet |
| `dur-screen` | 350–400 ms | Cambio de pantalla (push / pop) |
| `dur-dissolve` | 300 ms por cuadrado + 40 ms de desfase por columna (≈ 420 ms) | Eliminar bloque |
| `dur-rebuild` | 350 ms por cuadrado + 40 ms de desfase por columna (≈ 470 ms) | Deshacer la eliminación de un bloque |
| `dur-lift` | 150 ms *(estimación)* | Levantar el bloque al reordenar |
| `dur-reorder-shift` | 200 ms *(estimación)* | Los bloques vecinos se apartan al arrastrar |
| `dur-reorder-settle` | 250 ms *(estimación)* | Soltar el bloque reordenado |
| `dur-splash` | 1000 ms en total | Arranque de la app |
| `time-undo` | 10 s | Tiempo que «Undo» permanece disponible |
| `time-longpress` | 400 ms | Pulsación larga que activa el reordenado |
| `ease-standard` | cubic-bezier(.2, 0, 0, 1) | Movimientos dentro de la pantalla |
| `ease-decelerate` | cubic-bezier(.05, .7, .1, 1) | Entrar |
| `ease-accelerate` | cubic-bezier(.3, 0, .8, .15) | Salir |
| `ease-ring` | cubic-bezier(.65, 0, .35, 1) | Vuelta del anillo en el arranque |

Los valores son propuestas de diseño probadas solo en un prototipo CSS, no con usuarios. Las duraciones marcadas como *(estimación)* hay que confirmarlas en dispositivo. Estos tokens viven solo en esta tabla: `tokens.json` no admite una familia de movimiento.

Sin componente propio en el sistema:

- **Pestañas:** el indicador se desliza a la pestaña nueva. `dur-medium`, `ease-decelerate`.
- **Cambio de pantalla:** entra por la derecha; la anterior se desplaza un 25 %. `dur-screen`.
- **Arranque de la app:** el coral aparece; las teclas saltan en sentido horario formando un anillo y este se cierra con una vuelta. `dur-splash` (1 s); solo en arranque en frío.

Reglas de comportamiento, catálogo completo y pendientes: ficha de animaciones (`Ficha_animaciones_MyGDD`). Laboratorio de pruebas: https://claude.ai/artifact/ABbx4F2jBQQvFTv92osSiv

## Color

Los roles vienen del export de Material Theme Builder (semilla #3F48CC, «Color match» activado) y tienen cuatro temas: Light, Dark y sus versiones de alto contraste. Aviso y éxito son colores extendidos sin armonizar; los fondos suaves son propios.

| Token | Para qué |
| --- | --- |
| `primary` / `on-primary` | Botón filled de la acción principal y enlaces (siempre subrayados). |
| `primary-container` / `on-primary-container` | FAB. |
| `secondary` | Opción elegida en un button group y anillo de foco. |
| `secondary-container` / `on-secondary-container` | Indicador de la barra de navegación, botón tonal, chip seleccionado. |
| `surface` / `on-surface` / `on-surface-variant` | Fondo, texto principal y texto secundario. |
| `surface-container-low` | Fondo de las pantallas con tarjetas (y de su barra superior y pestañas) y bottom sheets. |
| `surface-container-lowest` / `surface-container-high` | Tarjetas: `lowest` en claro, `high` en oscuro (en oscuro, lo que está encima es más claro). Borde de 1 px en `outline-variant`. |
| `surface-container` / `surface-container-highest` | Barra de navegación y floating toolbar / bloque seleccionado. |
| `primary-fixed` + `on-primary-fixed-variant` | Banda de la tarjeta de proyecto en claro; en oscuro, `secondary-container` + `on-secondary-container`. |
| `bloque-1` … `bloque-6` | Colores de departamento: franja de la tarjeta del departamento y de sus bloques. |
| `outline` / `outline-variant` | Bordes de campos y chips / bordes de tarjetas y separadores. |
| `inverse-surface` / `inverse-on-surface` / `inverse-primary` | Snackbar neutro (Undo) y su acción. |
| `aviso-suave` + `on-surface`, borde y etiqueta `aviso` / `on-aviso` | Avisos: «3 blocks out of date», `! Out of date`. |
| `exito-suave` + `on-surface`, etiqueta `exito` / `on-exito` | Confirmaciones: snackbar `✓ OK`. |
| `error-suave` + `on-surface`, etiqueta `error-container` / `on-error-container` | Mensajes de error: snackbar `× Error`; «Retry» en `error`. |
| `error-container` / `on-error-container` | Badge de notificaciones: rojo, como los mensajes de error. |
| `error` / `on-error` | Solo errores: errores de campos, «Retry» y acciones destructivas (Delete). |

Reglas:

- El índigo es para acciones, nunca para estados. Amarillo = aviso, rojo = errores y avisos de notificación, verde = confirmación (el lenguaje de las consolas de Unity, Unreal y Godot).
- Los colores vivos (`aviso`, `exito`, `error-container`) solo rellenan elementos pequeños con texto oscuro encima: etiquetas, símbolos, badges. Los mensajes grandes usan el fondo suave con `on-surface`.
- Etiqueta de estado = símbolo + palabra en Roboto Mono, mayúsculas: `! Out of date`, `✓ OK`, `× Error`. Es el rasgo de identidad del producto. Si el texto de al lado ya dice la palabra, la etiqueta puede llevar solo el símbolo (chips de estado). Excepción: en las tarjetas de bloque el estado va solo con símbolo (`!`, check, círculo discontinuo) y el texto queda para lectores de pantalla.
- Los avisos con fondo `aviso-suave` llevan borde de 1 px en `aviso`, el mismo amarillo del `!` (decorativo).
- Los colores de departamento (`bloque-1` … `bloque-6`: Lavanda, Cielo, Agua, Lila, Piedra y Niebla) solo identifican departamentos: van en la franja de la tarjeta del departamento y de sus bloques, nunca indican estado y no se usan en otros componentes. Son tonos fríos para no confundirse con aviso, éxito ni error. Se reparten en orden y se repiten cada seis.
- No se usan `tertiary` (magenta) ni `background` (lavanda, no coincide con `surface`).
- En modo oscuro la elevación se marca con superficies más claras, no con sombras.

El color nunca es la única pista: cada estado tiene un símbolo de forma distinta (`!`, check, círculo discontinuo) y su texto («Out of date», «Up to date», «Empty»), visible o para lectores de pantalla.

## Tipografía

Roboto, la tipografía de M3, con la escala tipográfica estándar (Display, Headline, Title, Body, Label). En la app: `title-large` para la top app bar, `body-large` para listas y campos, `label-large` para botones, `body-small` para ayudas y errores. El nombre de la app se escribe como el logo: «My» en Roboto 400 y «GDD» en Roboto 700, con el punto cuadrado (ver Marca).

## Forma, espacio y elevación

- **Espacio** en pasos de 4 y 8: `space-4` (16 px) es el margen lateral de todas las pantallas; `space-2` (8 px) separa tarjetas.
- **Forma**: ver `corner-*`. Expressive añade `corner-large-increased`, `corner-extra-large-increased` (la floating toolbar) y `corner-extra-extra-large`.
- **Elevación** con sombra solo en lo que flota: `elevation-3` en FAB, floating toolbar y snackbar; `elevation-1` en la hoja del editor.
- Zona táctil mínima de 48 × 48 (`touch-target`) en todos los controles.

## Estados

Cada componente interactivo usa una capa del color de su contenido: hover `state-hover` (8 %), foco `state-focus` (10 %) más un anillo de 3 px en `secondary`, pulsado `state-pressed` (10 %). Desactivado: fondo `on-surface` al `disabled-container` (12 %) y contenido `on-surface` al `disabled-content` (38 %), calculados desde los tokens para que funcionen en los cuatro temas. Cada tarjeta de componente enseña sus estados.

## Iconografía

**Material Symbols Rounded** (opción A, «Consola», elegida por el equipo): peso 500, grade 0, relleno solo en lo activo (`'FILL' 1` en el destino activo de la barra de navegación; contorno en el resto).

- Tamaños: 24 px por defecto (`icon-size`), 20 px en tarjetas y chips, 16 px para los estados de bloque.
- Siempre dentro de una zona táctil de 48 px y con `aria-label` si el icono va solo.
- Iconos de departamento: `casino` (Game design), `auto_stories` (Narrative), `palette` (Art), `animation` (Animation), `map` (Level design), `code` (Programming), `touch_app` (UI & UX), `music_note` (Audio), `bug_report` (QA), `campaign` (Marketing).
- Estados de bloque, solo símbolo y con `aria-label`: `!` en `aviso` / `on-aviso` (Out of date), `check_circle` en `exito-texto` (Up to date) y círculo discontinuo en `on-surface-variant` (Empty).
- El prototipo de alta fidelidad («My GDD · Fase 5») ya usa Material Symbols Rounded; el wireframe conserva los iconos anteriores.

## Componentes

Top app bar, Navigation bar, Button, Icon button, FAB, Button group, Chip, Text field, Switch, List item, Card, Dialog, Bottom sheet, Snackbar y Floating toolbar. Cada uno tiene su tarjeta con estados y sus reglas de uso. Además, el prototipo usa los date y time pickers modales de M3 (el de hora en modo texto, 24 h).

## Accesibilidad

- Texto con contraste 4,5:1 como mínimo sobre su fondo en todos los temas (3:1 a partir de 24 px, en bordes de controles e iconos).
- Pares justos: `on-error-container` sobre `error-container` (4,54:1) y `on-primary-container` sobre `primary-container` (4,56:1). Cumplen, sin margen.
- Etiquetas visibles en todos los campos; `aria-label` en los botones de solo icono.
- Foco de teclado siempre visible.
- Estados de bloque sin texto visible: pendiente de validar en el test con usuarios, sobre todo el círculo discontinuo.
- Ajustes del usuario: tamaño de texto, alto contraste y menos movimiento (Profile › Accessibility).

## Pendiente

- El prototipo de alta fidelidad dibuja con su propia copia de los colores; los tokens instalados en él están sincronizados con este sistema a 18/11. Volver a copiarlos cada vez que el sistema cambie.
- Componente de pestañas (Notes): aún no está en el sistema.
- Token de fuente monoespaciada para las etiquetas: las previews cargan Roboto Mono, pero `tokens.json` aún no lo recoge.
