# ListItem

List item de M3: 56 px (una línea) o 72 px (dos líneas).

- Icono inicial de 24 px en `on-surface-variant`, texto `body-large`, apoyo en `body-medium`.
- Al final: un chevron (navega), un dato corto (3 people, Today) o el menú ⋮.
- En Notes: una fila por nota (icono, título y fecha), título en 500 si no se ha leído; acciones en ⋮.
- **Movimiento al eliminar (notas y avisos, listas sin bloques):** la fila sale por la derecha y la lista se cierra. 300 ms, `ease-accelerate`; «Undo» 10 s.
