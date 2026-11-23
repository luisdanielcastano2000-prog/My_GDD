# NavigationBar

Navigation bar de M3 Expressive (versión corta, 80 px) con tres destinos: Home, Notes y Help.

- Activo: indicador 56 × 32 en `secondary-container` e icono relleno; inactivo: icono con contorno.
- Badge rojo `error-container` / `on-error-container` con el número de notas sin leer (decisión del 17/11: como los mensajes de error).
- **Movimiento del badge:** pulso con máximo 3 repeticiones; no en bucle infinito.
- Decisión del equipo: Help, Notes y Profile muestran flecha de back y vuelven a la pantalla anterior.
- No aparece en Log in, Sign up, Reset password ni en el editor.
