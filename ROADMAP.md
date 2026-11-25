# Roadmap de My GDD

Lista de trabajo a partir del encargo del 2026-11-24. El usuario envía cada sección cuando quiere empezarla; Claude la hace, la prueba (unitarias + `app/e2e`, en el Mac y en línea), la apunta en `BITACORA.md` y marca aquí su estado.

Estados: ⬜ pendiente · ❓ necesita una decisión del usuario antes de empezar · 🔄 en curso · ✅ hecho (con fecha y commit).

Orden recomendado: **1 → 2 → 3 → 4 → 5 → 6 → 7**. Primero lo que cambia cómo se guardan los datos (1 y 2); después lo que se apoya en ello (3, el correo, usa invitaciones y proyectos); al final lo visual (4–6), que no cambia datos.

---

## 1. «Out of date» de verdad ✅ 2026-11-24 (`bc25059`, comprobado en línea)

> **Decisión del usuario (2026-11-24): propuesta A** (con el extra del aviso «Saved»).

**Situación:** los avisos «Out of date» solo existen en los datos de ejemplo. Ni el código ni el prototipo dicen qué los provoca. Sí existe todo lo necesario para mostrarlos: estados de los bloques, avisos de cambio con bloques afectados, la pantalla de revisión y «Mark as reviewed».

**Propuestas** (elegir antes de empezar; ver el detalle en `BITACORA.md`, 2026-11-24):
- **A. «Note a change» marca los bloques** *(recomendada)*: al enviar una nota de cambio eliges qué bloques afecta, y esos pasan a «Out of date» para todo el equipo hasta que alguien los revisa. Encaja con la guía del diseño (pasos 4 y 5).
- **B. Dependencias entre bloques:** en cada bloque eliges de qué otros depende. Al guardar un cambio en uno, los que dependen de él pasan a «Out of date» solos.
- **C. Automático por la cadena de producción:** un cambio en un departamento marca los bloques de los departamentos que van detrás. Es fácil, pero marca mucho que no hace falta.
- Extra para A: al guardar un bloque, el aviso «Saved» ofrece «Note a change» para avisar con un toque.

Pasos (con A): 1.1 elegir los bloques en «New note» · 1.2 crear el aviso de cambio y marcar los bloques (servidor: para todo el equipo del GDD) · 1.3 revisar y marcar como revisado para todos · 1.4 pruebas e2e.

## 2. Invitar a proyectos concretos y con roles por departamento ✅ 2026-11-24 (`1baad56`, comprobado en línea)

> **Decisión del usuario (2026-11-24): sí a todo** — elegir GDDs al invitar (y cambiarlos en *Manage*); por GDD: Viewer / Editor / Editor de departamentos; las notas a un departamento llegan solo a quien lo tiene.

**Situación:** hoy el equipo es de la cuenta. Quien acepta ve **todos** tus GDDs con un único rol (Editor o Viewer). El campo «departamento» de cada persona solo es un texto.

**Dudas para el usuario:**
- ¿Se elige, al invitar, a qué GDDs entra la persona (casillas)? ¿Y se puede cambiar después desde *Manage*?
- «Rol relacionado con los departamentos»: propuesta — en cada GDD, **Viewer** (lee todo), **Editor** (escribe en todo) o **Editor de departamentos** (escribe solo en los departamentos que elijas y lee el resto). ¿Es eso?
- ¿Las notas «a un departamento» (chip de *New note*) deben llegar solo a quien tiene ese departamento?

Pasos: 2.1 modelo de acceso por GDD y por departamento (servidor + pruebas) · 2.2 hoja «Invite» y «Manage» con proyectos y departamentos · 2.3 permisos en pantallas (solo lectura por departamento) · 2.4 notas por departamento · 2.5 pasar las personas de hoy al modelo nuevo · 2.6 pruebas.

## 3. Correo real ✅ 2026-11-24 en el código · ⏳ falta que el usuario active Brevo (pasos abajo)

> **Decisión del usuario (2026-11-24): Brevo.** Se puede entrar sin verificar (con aviso), pero no invitar ni aceptar invitaciones hasta verificar.

**Qué incluye:** verificar el email al registrarse; enlace para crear una contraseña nueva («Forgot password»); aviso por email al cambiar la contraseña; invitaciones por email con enlace; confirmar el cambio de email.

**Dudas para el usuario:**
- **Servicio de correo.** Recomendado: **Brevo** (gratis, 300 correos al día, sin dominio propio: basta con verificar tu email como remitente). Alternativa: **Gmail** con contraseña de aplicación. Resend pide un dominio propio para escribir a otras personas.
- Hasta verificar el email, ¿se puede entrar? Propuesta: **sí**, con un aviso; pero no se puede invitar ni aceptar invitaciones hasta verificar.
- La clave del servicio la pones **tú** en Render (*Environment*). **Nunca en el chat.**

Pasos: 3.1 cuenta y clave en Render (usuario) · 3.2 envío de correos en la API (`@nestjs/mail` o similar) y plantillas · 3.3 verificación al registrarse · 3.4 «Forgot password» con enlace de un solo uso y caducidad · 3.5 aviso al cambiar la contraseña · 3.6 invitaciones por email (enlace que lleva a *Sign up* o *Log in*) · 3.7 confirmar el cambio de email · 3.8 pruebas (en local, los correos se guardan sin enviarse).

### Activar Brevo (lo hace el usuario; nunca pegar la clave en el chat)

1. Crear una cuenta gratis en https://www.brevo.com (pide nombre y algún dato de la empresa: vale poner «My GDD» / uso personal).
2. **Remitente:** menú de la cuenta → *Senders, Domains & Dedicated IPs* → *Senders* → *Add a sender*. Nombre: `My GDD`; email: el tuyo (p. ej. tu Gmail). Brevo te manda un correo: ábrelo y confírmalo.
3. **Clave:** menú de la cuenta → *SMTP & API* → pestaña *API Keys* → *Generate a new API key* → nombre `my-gdd` → copia la clave (solo se ve una vez).
4. **Render:** servicio `my-gdd` → *Environment* → *Add Environment Variable*, tres veces:
   - `BREVO_API_KEY` = la clave del paso 3
   - `MAIL_FROM` = el email del paso 2
   - `APP_URL` = `https://my-gdd.onrender.com`
   Luego *Save, rebuild and deploy*.
5. Decirle a Claude «Brevo activado». Prueba: crear una cuenta con **tu** email y comprobar que llega «Verify your email» (mira también en *Spam*).

A tener en cuenta:
- Con un remitente Gmail (sin dominio propio), algunos correos pueden llegar a *Spam*. Para mejorarlo, más adelante se puede usar un dominio propio en Brevo.
- Al activarlo, las cuentas que ya existen aparecen **sin verificar**: verán el aviso y tendrán que pulsar *Send link* una vez para poder invitar o aceptar.
- Plan gratis: 300 correos al día.

## 4. Color de acento ✅ 2026-11-24

> **Decisión del usuario (2026-11-24):** solo botones, enlaces y selección (no los colores de los departamentos).

**Situación:** se elige (Blue, Green, Orange, Purple, Grey) y se guarda, pero **no cambia nada**: la app usa siempre la paleta azul. El propio diseño lo deja para más adelante («The accent color arrives with the color palette»); los tokens solo traen la paleta azul.

**Propuesta:** el acento cambia la familia «primary» (botones, FAB, enlaces, selección, anillo de foco) y no los colores de los departamentos. Se generan las paletas de cada acento para los 4 temas (claro, oscuro y alto contraste) y se comprueba el contraste (AA).

Pasos: 4.1 paletas por acento y por tema · 4.2 aplicarlas al elegir (también en la vista previa de *Edit profile*) · 4.3 comprobación de contraste y capturas.

## 5. Animaciones que faltan ✅ 2026-11-24 (5.1–5.4; 5.5 ver bitácora)

Según el README del sistema de diseño (tabla de movimiento) y los marcos `Mov-*`:
- 5.1 **Eliminar un bloque, desintegrándose en cuadrados** (`dur-dissolve`); hoy solo se encoge y se desvanece.
- 5.2 **Reconstruir el bloque al pulsar *Undo*** (`dur-rebuild`); hoy no existe.
- 5.3 **Reordenar arrastrando con una pulsación larga** (`time-longpress`, `dur-lift`, `dur-reorder-shift`, `dur-reorder-settle`); hoy solo existen *Move up/down*.
- 5.4 **Arranque de la app**: el coral aparece y las teclas forman un anillo (`dur-splash`, `ease-ring`); hoy no existe.
- 5.5 Repasar el resto contra los marcos `Mov-*`, en normal, lento ×4 y reducido.

Todas respetan «menos movimiento» (fundido de 150 ms o menos).

## 6. Idiomas: español y catalán ✅ 2026-11-25 (`ac3d1f5`, comprobado en línea) · japonés más adelante · correos en inglés (decisión del usuario)

> **Decisión del usuario (2026-11-24):** por ahora **solo catalán y castellano**; el japonés, más adelante.

**Es abarcable.** La interfaz tiene unos 300 textos. Hace falta un sistema de traducción que cambie al momento (sin recargar), y también las fechas («2 days ago») y los mensajes de la API. El contenido de los GDDs no se traduce.

**A tener en cuenta:**
- El japonés necesita una fuente con sus caracteres (Noto Sans JP; Roboto no los tiene) y revisar textos largos o cortos en botones.
- Las traducciones las hago yo: conviene que las revise alguien nativo, sobre todo el japonés.
- El resto de idiomas de la lista (Deutsch, Français…) seguirían en inglés, con el aviso actual.

Pasos: 6.1 sistema de traducción + inglés · 6.2 español · 6.3 catalán · 6.4 japonés + fuente · 6.5 fechas y mensajes del servidor · 6.6 pruebas en los 4 idiomas.

## 7. Pequeños pendientes ✅ 2026-11-25 en el Mac (`8f2b605`) · ⏳ sin publicar

- 7.1 ✅ **Borrar la cuenta:** ya existe en *Profile › Personal info › Delete account*. **Decisión del usuario: no añadir acceso directo en *Profile*.**
- 7.2 ✅ **Verificación en dos pasos real, con código por correo** (decisión del usuario, 2026-11-25). En línea queda inactiva hasta activar Brevo (sección 3).
- 7.3 ✅ Prettier en `app/` (commit aparte, solo formato; los diccionarios generados quedan fuera de Prettier).
- 7.4 ✅ **Decisión del usuario (2026-11-25): se acepta el plan gratis** (se duerme a los 15 min; primera carga ~1 min).

---

## Hecho antes de este roadmap

- ✅ 2026-11-24 Publicación en Render; revisión completa y arreglos (fechas, descarga de datos, feedback, sesiones, límite de intentos…).
- ✅ 2026-11-24 GDDs compartidos con el equipo (Editor / Viewer), invitaciones que se aceptan en la app y cambios simultáneos sin pisarse (`41313b5`, `4a6eded`).
- ✅ 2026-11-24 Pruebas e2e en `app/e2e` (21) y aviso al cerrar con cambios sin guardar (`7fcd390`).
