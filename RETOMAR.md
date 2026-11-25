> **⏸️ En pausa (2026-11-25, por decisión del usuario):** investigar el fallo ocasional de `app/e2e/animations.spec.ts` «arranque» (falló una vez en la suite completa en el Mac; sola pasa). Estimado 30–60 min; si en 1 h no se reproduce, parar e informar. **Recordárselo al usuario** cuando dé nuevas instrucciones, y no empezarlo sin su OK.

> **Actualización 2026-11-25 (Brevo):** roadmap completo y en línea, **con Brevo activo** (los correos llegan; la verificación en dos pasos ya se puede usar). No queda nada pendiente: lo siguiente es trabajo nuevo que pida el usuario.

> **Actualización 2026-11-25:** secciones 1–6 del roadmap hechas y publicadas (la 6, idiomas es/ca, comprobada en línea; los correos siguen en inglés por decisión del usuario). Lo siguiente: sección 7 de `ROADMAP.md` (pequeños pendientes). Brevo (sección 3) sigue pendiente de que el usuario lo active.

> **Actualización 2026-11-24:** la app está publicada en https://my-gdd.onrender.com, revisada a fondo y con los fallos encontrados corregidos. Hechos los puntos 2 y 3 (GDDs compartidos con Editor/Viewer e invitaciones que se aceptan). Lo siguiente está en **`ROADMAP.md`** (secciones 1–7, en orden recomendado). El usuario envía cada sección; las marcadas ❓ necesitan antes su decisión. La sección 3 queda como referencia.

# Retomar My GDD (mañana)

## 1. Prompt para pegar al empezar

Abre Claude Code en `~/Documents/MyGDD` (o en tu carpeta de usuario) y pega esto tal cual:

```
Seguimos con My GDD, en ~/Documents/MyGDD.
Antes de nada, lee CLAUDE.md, BITACORA.md y RETOMAR.md.
Estamos publicando la app en Render (un solo servicio: web + API) con la base my_gdd en MongoDB Atlas.
El código ya está en GitHub (My_GDD). Me toca crear el Web Service en Render con la guía de RETOMAR.md;
cuando te pase la dirección .onrender.com, compruébala tú. Dame siempre todos los pasos de una vez.
```

Si usas **otro ordenador**, cambia la primera línea por:
`El proyecto está en GitHub: https://github.com/luisdanielcastano2000-prog/My_GDD — clónalo y seguimos.`
(Para publicar en Render no hace falta tener nada instalado: Render y Atlas están en internet.)

## 2. Dónde nos quedamos

| Pieza | Dónde | Estado |
|---|---|---|
| Diseño | `design/` (copia de claude.ai, solo lectura) | ✅ |
| Web (Ionic + Angular) | `app/` | ✅ 56 pantallas, conectada a la API |
| API (NestJS + Mongoose) | `api/` | ✅ cuentas reales, probada en el Mac (también en modo producción) |
| Base de datos | MongoDB Atlas, Cluster0, base `my_gdd` | ✅ creada desde Render |
| GitHub | `luisdanielcastano2000-prog/My_GDD` (público) | ✅ todo subido |
| Render | servicio `my-gdd` → https://my-gdd.onrender.com | ✅ en línea, comprobado 2026-11-24 |

## 3. Lo primero que haremos: crear el servicio en Render

1. En Render: **New + → Web Service** → conecta **`My_GDD`**. Si no aparece: *Configure account* → en GitHub, dale acceso a Render a ese repositorio.
2. Rellena:

   | Casilla | Valor |
   |---|---|
   | Name | `my-gdd` |
   | Region | Frankfurt |
   | Branch | `main` |
   | Root Directory | *(vacío)* |
   | Runtime | Node |
   | Build Command | `npm run build` |
   | Start Command | `npm start` |
   | Instance Type | Free |

3. **Environment Variables** (tres):
   - `MONGODB_URI` → la **misma** que tiene el servicio `catalogo-tech-api` (Render → ese servicio → *Environment* → mostrar y copiar). No hay que cambiarla: el código elige la base `my_gdd`.
   - `JWT_SECRET` → botón **Generate**.
   - `NODE_ENV` → `production`.
4. **Create Web Service** y esperar a **Live** 🟢 (la primera vez, unos 3–5 minutos).
5. Pasarle a Claude la dirección `.onrender.com` (no es secreta). Claude crea una cuenta de prueba, comprueba que se guarda y la borra.

Si el deploy falla: copia el **bloque entero** de *Logs* (ahí no sale la contraseña) y pégaselo a Claude.

**En Atlas no hay que tocar nada:** *Network Access* ya tiene `0.0.0.0/0` activo (de Catálogo Tech).

## 4. Qué queda después

- Comprobación final en la dirección pública (crear cuenta, GDD, recargar, log out / log in) y ver la base `my_gdd` en Atlas (*Browse Collections*).
- Apuntar la dirección pública en `CLAUDE.md` y en la bitácora.
- Pendientes menores (ver «Pendiente» en `BITACORA.md`): animación de borrar en cuadrados, reordenar arrastrando, escenas sin marco F5, correo real (contraseña olvidada, invitaciones).

## 5. Arrancar la app en el Mac (no hace falta para Render)

Tres pestañas de terminal, en este orden (todo se queda corriendo; `Ctrl + C` para parar):
1. MongoDB: `~/mongodb/bin/mongod --dbpath ~/mongodb-data --bind_ip localhost --ipv6`
2. API: `cd ~/Documents/MyGDD/api && npm run start:dev`
3. Web: `cd ~/Documents/MyGDD/app && npx ionic serve` → abrir `http://localhost:8100`

Selector de las 56 pantallas del diseño (datos de ejemplo): `http://localhost:8100/scenes`.

## 6. Recordatorios

- **Contraseñas, cadenas de Atlas y tokens: nunca en el chat.**
- Render gratis se duerme a los 15 minutos sin visitas: la primera carga puede tardar ~1 minuto.
- Los servidores que arrancó Claude hoy (MongoDB, API y web) se apagan al cerrar la sesión.
- Nunca escribir en claude.ai: el diseño se resincroniza con «resincroniza el diseño según design/SYNC.md».
