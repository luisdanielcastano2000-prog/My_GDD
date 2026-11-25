// Juntar dos versiones de un GDD (cuando dos personas lo cambian a la vez).
//
//  base   = cómo estaba la última vez que lo guardé (lo que yo tenía del servidor)
//  mine   = cómo lo tengo ahora (con mis cambios sin guardar)
//  theirs = cómo está ahora en el servidor (con los cambios de la otra persona)
//
// Regla: lo que yo cambié gana; lo que no toqué se queda como lo dejó la otra persona.
// Se mira campo a campo y, en las listas (departamentos, bloques, secciones), elemento a elemento
// por su id. Si los dos cambiamos la MISMA sección de texto, gana la mía (la última en guardarse).
import type { Gdd } from './models';

type Obj = Record<string, unknown>;
type Item = Obj & { id: string };
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Une dos objetos campo a campo; los campos de `lists` son listas que se unen elemento a elemento. */
function mergeObj<T extends Obj>(
  base: T | undefined,
  mine: T,
  theirs: T,
  lists: Record<string, (b: Item | undefined, m: Item, t: Item) => Item> = {},
): T {
  if (base && same(mine, base)) return theirs; // yo no lo toqué
  if (base && same(theirs, base)) return mine; // la otra persona no lo tocó
  const out: Obj = {};
  for (const k of new Set([...Object.keys(mine), ...Object.keys(theirs)])) {
    const b = base?.[k],
      m = mine[k],
      t = theirs[k];
    if (lists[k] && Array.isArray(m) && Array.isArray(t))
      out[k] = mergeList((Array.isArray(b) ? b : []) as Item[], m as Item[], t as Item[], lists[k]);
    else out[k] = base && same(m, b) ? t : m;
  }
  return out as T;
}

/** Une dos listas de elementos con id. */
export function mergeList(
  base: Item[],
  mine: Item[],
  theirs: Item[],
  item: (b: Item | undefined, m: Item, t: Item) => Item,
): Item[] {
  const B = new Map(base.map((x) => [x.id, x]));
  const M = new Map(mine.map((x) => [x.id, x]));
  const T = new Map(theirs.map((x) => [x.id, x]));
  const out: Item[] = [];
  for (const t of theirs) {
    const m = M.get(t.id),
      b = B.get(t.id);
    if (!m) {
      if (b && same(b, t)) continue; // lo borré yo y la otra persona no lo tocó: fuera
      out.push(t); // nuevo de la otra persona, o lo borré yo pero ella lo cambió: se queda
      continue;
    }
    out.push(item(b, m, t));
  }
  // Lo que añadí yo: detrás del elemento que tenía delante en mi lista
  mine.forEach((m, i) => {
    if (B.has(m.id) || T.has(m.id)) return;
    const at = i > 0 ? out.findIndex((x) => x.id === mine[i - 1].id) : -1;
    out.splice(at + 1, 0, m);
  });
  // Si yo cambié el orden y la otra persona no, vale mi orden
  const order = (arr: Item[]) => arr.map((x) => x.id).filter((id) => B.has(id));
  if (same(order(theirs), order(base)) && !same(order(mine), order(base))) {
    const pos = new Map(mine.map((x, i) => [x.id, i]));
    let last = -1;
    const rank = new Map(
      out.map((x) => {
        const p = pos.get(x.id);
        if (p !== undefined) last = p;
        return [x.id, p ?? last + 0.5];
      }),
    );
    out.sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
  }
  return out;
}

const section = (b: Item | undefined, m: Item, t: Item): Item => (b && same(m, b) ? t : m);
const block = (b: Item | undefined, m: Item, t: Item): Item => mergeObj(b, m, t, { secs: section });
const dept = (b: Item | undefined, m: Item, t: Item): Item => mergeObj(b, m, t, { blocks: block });

/** El GDD juntado. Lleva la versión (rev) del servidor, para guardarlo encima de ella. */
export function mergeGdd(base: Gdd | undefined, mine: Gdd, theirs: Gdd): Gdd {
  const g = mergeObj(base as unknown as Obj | undefined, mine as unknown as Obj, theirs as unknown as Obj, {
    depts: dept,
  }) as unknown as Gdd;
  return { ...g, rev: theirs.rev, share: mine.share, uts: Math.max(mine.uts ?? 0, theirs.uts ?? 0) || undefined };
}
