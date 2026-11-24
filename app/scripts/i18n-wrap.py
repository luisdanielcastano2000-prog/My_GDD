# Ayuda de una sola vez (roadmap 6): envuelve con el pipe | t los textos FIJOS de las plantillas Angular.
# - Nodos de texto: «>Log in<» → «>{{ 'Log in' | t }}<» (también dentro de bloques @if { … }).
# - Texto con huecos: «Department {{ pos() }} of {{ n }}» → «{{ 'Department {p0} of {p1}' | t: { p0: pos(), p1: n } }}».
# - Atributos fijos de texto: aria-label, placeholder, title, label, sub, searchLabel → enlazados con | t.
# No toca: nombres de iconos de Material (minúsculas con _), expresiones de TypeScript ni comparaciones.
# Lo que queda (textos dentro de expresiones y en .ts) se hace a mano. Uso: python3 scripts/i18n-wrap.py archivo.ts…
import re
import sys

ICON = re.compile(r'^[a-z0-9_]+$')
ATTRS = ['aria-label', 'placeholder', 'title', 'label', 'sub', 'searchLabel']
NATIVE = {'aria-label': '[attr.aria-label]', 'placeholder': '[placeholder]'}


def esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace("'", "\\'")


def wrap_text(text: str) -> str:
    """Un trozo de texto entre etiquetas (puede tener {{ }})."""
    core = text.strip()
    if not core or not re.search(r'[A-Za-z]', re.sub(r'\{\{.*?\}\}', '', core)):
        return text
    if '| t' in core or core.startswith('@') or ICON.match(core):
        return text
    lead = text[: len(text) - len(text.lstrip())]
    trail = text[len(text.rstrip()):]
    exprs = re.findall(r'\{\{\s*(.*?)\s*\}\}', core)
    if not exprs:
        return f"{lead}{{{{ '{esc(core)}' | t }}}}{trail}"
    i = 0
    def rep(_m):
        nonlocal i
        k = f'{{p{i}}}'
        i += 1
        return k
    key = re.sub(r'\{\{\s*.*?\s*\}\}', rep, core)
    if not re.search(r'[A-Za-z]{2}', re.sub(r'\{p\d+\}', '', key)):
        return text  # solo huecos y signos: nada que traducir
    if any('?' in e and ':' in e for e in exprs):
        return text  # ternarios: a mano
    vars_ = ', '.join(f'p{n}: {e}' for n, e in enumerate(exprs))
    return f"{lead}{{{{ '{esc(key)}' | t: {{ {vars_} }} }}}}{trail}"


def wrap_template(tpl: str) -> str:
    # 1) Atributos fijos
    for a in ATTRS:
        bind = NATIVE.get(a, f'[{a}]')
        tpl = re.sub(rf'(?<![\[\w.-]){re.escape(a)}="([^"{{}}]*[A-Za-z][^"{{}}]*)"', lambda m: f'{bind}="\'{esc(m.group(1))}\' | t"', tpl)
    # 2) Texto entre «>» o «{» (inicio de bloque) y «<» o «}» (fin de bloque), fuera de etiquetas y de {{ }}
    out, i, n = [], 0, len(tpl)
    while i < n:
        c = tpl[i]
        if c == '<':  # etiqueta: copiar tal cual
            j = tpl.find('>', i)
            out.append(tpl[i:j + 1]); i = j + 1; continue
        # trozo de texto hasta la próxima etiqueta o llave de bloque (respetando {{ }})
        j, depth = i, 0
        while j < n:
            if tpl.startswith('{{', j): depth += 1; j += 2; continue
            if tpl.startswith('}}', j) and depth: depth -= 1; j += 2; continue
            if depth == 0 and tpl[j] in '<{}': break
            j += 1
        chunk = tpl[i:j]
        # partes con @if/@for/@case… (control) no son texto: se separan por líneas
        if '@' in chunk or '(' in chunk.split('{{')[0] and ')' in chunk.split('{{')[0]:
            out.append(chunk)
        else:
            out.append(wrap_text(chunk))
        if j < n and tpl[j] in '{}':  # llave de bloque: se copia; «<» lo trata la vuelta siguiente (etiqueta)
            out.append(tpl[j]); j += 1
        i = j
    return ''.join(out)


for path in sys.argv[1:]:
    src = open(path, encoding='utf8').read()
    new = re.sub(r'(template: `)(.*?)(`,\n)', lambda m: m.group(1) + wrap_template(m.group(2)) + m.group(3), src, flags=re.S)
    if new != src:
        open(path, 'w', encoding='utf8').write(new)
        print('envuelto:', path)
