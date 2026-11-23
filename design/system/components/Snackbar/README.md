# Snackbar

Snackbar de M3 con una línea de texto y como mucho una acción. Tiene tres variantes según lo que comunica.

- **Neutro** (`inverse-surface` / `inverse-on-surface`, acción en `inverse-primary`): Undo durante `time-undo` (10 s) tras borrar un bloque, una nota o un recordatorio.
- **Confirmación** (`exito-suave`, texto `on-surface`, etiqueta `✓ OK` en `exito` / `on-exito`): «Blockings reviewed · Up to date», «Note sent».
- **Error** (`error-suave`, texto `on-surface`, etiqueta `× Error` en `error-container` / `on-error-container`): cuando falla guardar o enviar. La acción «Retry» va en `error`.
- La etiqueta es símbolo + palabra en Roboto Mono, en mayúsculas (estilo consola). El símbolo lleva `aria-hidden` y el lector de pantalla lee la palabra.
- Va por encima de la barra de navegación, del FAB o de la floating toolbar, nunca debajo.
- Desviación de M3 (decisión del equipo): M3 pinta todos los snackbars con `inverse-surface`; aquí la confirmación y el error usan los fondos suaves.
- **Movimiento de la confirmación «✓ OK» (toast):** entra desde abajo 400 ms, se queda 2,4 s y sale en 300 ms.
