# Card

Tarjetas de My GDD, con la estructura del prototipo de alta fidelidad (17–18/11). Todo lo que actúa sobre la tarjeta vive dentro de ella: el ⋮ abre un bottom sheet con Rename, Move y Delete. Las tarjetas no llevan lápiz de renombrar (decisión del equipo).

- **Estructura común:** la pantalla va en `surface-container-low`; la tarjeta, en `surface-container-lowest` (claro) o `surface-container-high` (oscuro), con borde de 1 px en `outline-variant`. En oscuro no hay sombra.
- **Proyecto** (carrusel de Home): 286 × 360, radio `corner-extra-large` (28). Banda de portada de 196 px en `primary-fixed` con el icono en `on-primary-fixed-variant` (en oscuro, `secondary-container` y `on-secondary-container`) y el ⋮ en un círculo del color de la tarjeta. Debajo: nombre (22 px), descripción y, si hay bloques desactualizados, el chip «N blocks out of date»: fondo `aviso-suave` con borde de 1 px en `aviso`, texto `on-surface` y símbolo `!` en `aviso` / `on-aviso`.
- **Departamento** (lista Departments): mínimo 80 px, radio `corner-large` (16). Franja izquierda de 56 px en su color de departamento (`bloque-1` … `bloque-6`) con el número de orden en Roboto Mono 700 de 20 px en `secondary` (01, 02…). Nombre, recuento y estado (check en `exito-texto`, círculo discontinuo o el chip «N out of date»), y ⋮ a la derecha.
- **Bloque** (rejilla de 2 columnas dentro del departamento): 108 px de alto, radio `corner-large` (16). Franja superior de 47 px con el color de su departamento, el número del bloque en Roboto Mono 700 de 24 px en `secondary`, el estado y el ⋮; el nombre va abajo. 1.er toque selecciona (fondo `surface-container-highest`, borde `secondary`); 2.º toque abre el editor.
- **Estado de bloque:** solo símbolo, con su texto en `aria-label`: `!` en `aviso` / `on-aviso` (Out of date), `check_circle` en `exito-texto` (Up to date) y círculo discontinuo en `on-surface-variant` (Empty).
- **Colores de departamento:** se reparten en orden y se repiten cada seis; un departamento nuevo toma el siguiente al del último. Solo identifican el departamento: nunca indican estado ni se usan en otros componentes. Con más de seis departamentos se repiten (01 y 07 comparten color): el número y el nombre siguen siendo la referencia.
- **Otros radios:** elementos de Out of date y «Continue writing», `corner-medium` (12); proyectos de Notes, `corner-large` (16).

## Movimiento
- **Estados de bloque:** al día, el check se dibuja; desactualizado, el «!» vibra una vez; vacío, sin animación. Solo cuando el estado cambia mientras el usuario lo ve.
- **Bloque · crear:** «palomitas» (salta, gira, cae, rebota una vez), solo al crearlo con el FAB; ~500 ms.
- **Bloque · eliminar:** el bloque (una sola pieza) se separa en 8 cuadrados que salen en diagonal arriba a la derecha, del color del bloque. «Undo» los reconstruye. `dur-dissolve`, `dur-rebuild`, `time-undo`.
- **Bloque · reordenar:** pulsación larga (`time-longpress`), se levanta un 6 % con borde de acento y una vibración breve en móvil. En modo oscuro, sin sombra: superficie más clara. Hueco de destino con relleno tenue.
