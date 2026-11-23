# Button

Botones de M3 Expressive en cuatro variantes y dos tamaños.

## Cuándo usar cada uno
- **Filled** (`primary`): la acción principal de la pantalla, una sola. Log in, Create GDD, Open, Save, Send note.
- **Tonal** (`secondary-container`): acción importante pero no principal. Añadir un bloque (Block).
- **Outlined** (borde `outline-variant`): acción secundaria al lado de una filled. Note a change, Cancel en sheets.
- **Text** (`primary`): acciones de poco peso, en dialogs y snackbars. Cancel, Save en dialogs, Retry, Undo.

## Medidas
- S: 40 px de alto dentro de una zona táctil de 48 (`touch-target`), radio `corner-full`, texto `label-large`.
- M: 56 px (`button-height-m`), texto `title-medium`, para la acción principal al pie de una pantalla.

## Estados
Capa del color del contenido: hover `state-hover`, foco `state-focus` más anillo de 3 px en `secondary`, pulsado `state-pressed`. Desactivado: fondo on-surface a `disabled-container` y texto a `disabled-content`.

## Movimiento
- **Relleno y secundario:** al pasar el cursor sube 2 px; al pulsar escala 0,95. `dur-press`, `ease-standard`.
- **Con carga:** texto → spinner → check que se dibuja y el botón pasa a verde de éxito. Spinner mínimo 400 ms; check 350 ms.
