// Reglas del equipo (funciones puras, sin base de datos: así se prueban solas en team.spec.ts).
//
// Cada cuenta tiene UN equipo (users.team). Para entrar hay que ACEPTAR una invitación (invites):
// hasta entonces no se ve nada ni se recibe nada. Un miembro aceptado lleva uid = id de su cuenta.
//
// Acceso por proyecto (grants): cada persona tiene, por cada GDD al que entra, un rol y unos departamentos:
// - Viewer: lee todo el GDD (y envía notas). Sus departamentos solo sirven para recibir las notas «a un departamento».
// - Editor sin departamentos: escribe en todo el GDD (también crea, renombra, mueve y borra departamentos).
// - Editor con departamentos («Editor de departamentos»): escribe solo en los bloques de esos departamentos y lee el resto.
// Quien no tiene grants (personas de antes de este cambio) entra en TODOS los GDDs con su rol, como hasta ahora.

export type Role = 'Owner' | 'Editor' | 'Viewer';
export interface Grant { g: string; role: 'Editor' | 'Viewer'; depts: string[] }
export interface Member { id: string; uid?: string; name: string; email: string; dept: string; role: Role; you?: boolean; grants?: Grant[] }
export interface Invite { id: string; email: string; role: 'Editor' | 'Viewer'; grants?: Grant[] }
export interface Team { members: Member[]; invites: Invite[] }
/** Lo que una persona puede hacer en un GDD. depts vacío = todos. */
export interface Access { role: Role; depts: string[] }

/** JSON con las claves ordenadas: compara objetos aunque sus campos lleguen en otro orden. */
export const stable = (v: unknown): string =>
  JSON.stringify(v, (_k, x: unknown) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))) : x));
const str = (v: unknown, max = 200): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const role = (v: unknown): 'Editor' | 'Viewer' => (v === 'Viewer' ? 'Viewer' : 'Editor');

/** Limpia una lista de grants (forma, sin GDDs repetidos; solo GDDs del dueño si se da la lista). */
export function cleanGrants(v: unknown, ownGdds?: Set<string>): Grant[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const seen = new Set<string>();
  const out: Grant[] = [];
  for (const raw of v.slice(0, 200)) {
    const x = (raw ?? {}) as Record<string, unknown>;
    const g = str(x['g'], 64);
    if (!g || seen.has(g) || (ownGdds && !ownGdds.has(g))) continue;
    seen.add(g);
    const depts = Array.isArray(x['depts']) ? [...new Set(x['depts'].map((d) => str(d, 64)).filter(Boolean))].slice(0, 100) : [];
    out.push({ g, role: role(x['role']), depts });
  }
  return out;
}
/** Rol que se enseña en la lista del equipo: Editor si lo es en algún proyecto. */
const summary = (grants: Grant[] | undefined, fallback: 'Editor' | 'Viewer'): 'Editor' | 'Viewer' => (grants ? (grants.some((x) => x.role === 'Editor') ? 'Editor' : 'Viewer') : fallback);

/**
 * Lo que el dueño envía al guardar «My team» (PUT /api/me/team), limpiado contra lo guardado:
 * - puede quitar miembros y cambiarles el departamento y el acceso (proyectos, rol y departamentos);
 * - NO puede añadir miembros ni cambiar a quién apunta uno (uid, email, nombre): solo entra
 *   alguien que aceptó una invitación. Así nadie mete a otra cuenta en su equipo para mandarle notas;
 * - puede añadir y cancelar invitaciones (no dan acceso hasta que se aceptan), pero no a su propio email.
 * ownGdds: ids de los GDDs del dueño (los grants solo pueden apuntar a ellos).
 */
export function cleanTeam(saved: Team, incoming: { members: unknown[]; invites: unknown[] }, myEmail: string, ownGdds?: Set<string>): Team {
  const byId = new Map(saved.members.map((m) => [m.id, m]));
  const members: Member[] = [];
  for (const raw of incoming.members) {
    const m = (raw ?? {}) as Record<string, unknown>;
    const cur = byId.get(str(m['id']));
    if (!cur) continue; // un miembro nuevo solo puede llegar aceptando una invitación
    if (cur.you) { members.push({ ...cur, dept: str(m['dept'], 80) }); continue; }
    const grants = 'grants' in m ? cleanGrants(m['grants'], ownGdds) : cur.grants;
    const next: Member = { ...cur, role: summary(grants, role(m['role'])), dept: str(m['dept'], 80) };
    if (grants) next.grants = grants; else delete next.grants;
    members.push(next);
  }
  if (!members.some((m) => m.you)) { const me = saved.members.find((m) => m.you); if (me) members.unshift(me); }
  const taken = new Set([myEmail.toLowerCase(), ...members.map((m) => m.email.toLowerCase())]);
  const invites: Invite[] = [];
  for (const raw of incoming.invites) {
    const v = (raw ?? {}) as Record<string, unknown>;
    const email = str(v['email']).toLowerCase();
    if (!email || !email.includes('@') || taken.has(email)) continue;
    taken.add(email);
    const grants = cleanGrants(v['grants'], ownGdds);
    invites.push({ id: str(v['id'], 64) || email, email, role: summary(grants, role(v['role'])), ...(grants ? { grants } : {}) });
  }
  return { members, invites };
}

/** Papel de una cuenta en el equipo de un dueño, en general (null si no está). */
export function roleIn(ownerId: string, team: Team | undefined, uid: string): Role | null {
  if (ownerId === uid) return 'Owner';
  const m = team?.members.find((x) => x.uid === uid);
  return m ? m.role : null;
}

/** Lo que una cuenta puede hacer en un GDD concreto del dueño (null = no lo ve). */
export function accessIn(ownerId: string, team: Team | undefined, uid: string, gid: string): Access | null {
  if (ownerId === uid) return { role: 'Owner', depts: [] };
  const m = team?.members.find((x) => x.uid === uid);
  if (!m) return null;
  if (!m.grants) return { role: m.role === 'Viewer' ? 'Viewer' : 'Editor', depts: [] }; // personas de antes: todo
  const gr = m.grants.find((x) => x.g === gid);
  return gr ? { role: gr.role, depts: gr.depts } : null;
}

/**
 * Cuentas que reciben una nota enviada al equipo de un dueño, menos quien la envía:
 * - sin GDD: el dueño y todos los miembros aceptados;
 * - de un GDD: el dueño y quien tiene acceso a ese GDD;
 * - «a un departamento» (toDept): el dueño y quien tiene ese departamento en ese GDD.
 */
export function recipients(ownerId: string, team: Team | undefined, sender: string, gid?: string | null, toDept?: string | null): string[] {
  const out = [ownerId];
  for (const m of team?.members ?? []) {
    if (!m.uid || m.you) continue;
    if (!gid) { out.push(m.uid); continue; }
    const a = accessIn(ownerId, team, m.uid, gid);
    if (!a) continue;
    if (toDept && !a.depts.includes(toDept)) continue;
    out.push(m.uid);
  }
  return [...new Set(out)].filter((x) => x !== sender);
}

/**
 * ¿Respeta un cambio de un «Editor de departamentos» sus límites? Puede cambiar los bloques de sus
 * departamentos (escribir, añadir, borrar, renombrar, ordenar), pero no tocar los demás departamentos
 * ni la lista de departamentos (ni sus nombres, colores u orden).
 */
export function deptEditAllowed(cur: Record<string, unknown>[], next: Record<string, unknown>[], allowed: string[]): boolean {
  if (cur.length !== next.length) return false;
  const ok = new Set(allowed);
  return cur.every((c, i) => {
    const n = next[i];
    if (c['id'] !== n['id']) return false;
    const { blocks: cb, ...cRest } = c;
    const { blocks: nb, ...nRest } = n;
    if (stable(cRest) !== stable(nRest)) return false; // nombre, color… del departamento
    return ok.has(String(c['id'])) || stable(cb) === stable(nb);
  });
}

/**
 * «Out of date»: marca los bloques afectados por un cambio (pend + estado) dentro de los
 * departamentos de un GDD. Devuelve los departamentos nuevos y los ids que de verdad existían.
 */
export function markOutOfDate(depts: Record<string, unknown>[], aff: string[]): { depts: Record<string, unknown>[]; marked: string[] } {
  const want = new Set(aff);
  const marked: string[] = [];
  const out = depts.map((d) => ({
    ...d,
    blocks: (Array.isArray(d['blocks']) ? (d['blocks'] as Record<string, unknown>[]) : []).map((b) => {
      if (typeof b['id'] !== 'string' || !want.has(b['id'])) return b;
      marked.push(b['id']);
      return { ...b, pend: true, status: 'Out of date' };
    }),
  }));
  return { depts: out, marked };
}
