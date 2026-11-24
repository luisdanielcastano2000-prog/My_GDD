// Reglas del equipo (funciones puras, sin base de datos: así se prueban solas en team.spec.ts).
//
// Cada cuenta tiene UN equipo (users.team): las personas que lo forman (members) ven todos los GDDs
// de esa cuenta y reciben sus notas. Para entrar hay que ACEPTAR una invitación (invites): hasta
// entonces no se ve nada ni se recibe nada. Un miembro aceptado lleva uid = id de su cuenta.

export type Role = 'Owner' | 'Editor' | 'Viewer';
export interface Member { id: string; uid?: string; name: string; email: string; dept: string; role: Role; you?: boolean }
export interface Invite { id: string; email: string; role: 'Editor' | 'Viewer' }
export interface Team { members: Member[]; invites: Invite[] }

const str = (v: unknown, max = 200): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const role = (v: unknown): 'Editor' | 'Viewer' => (v === 'Viewer' ? 'Viewer' : 'Editor');

/**
 * Lo que el dueño envía al guardar «My team» (PUT /api/me/team), limpiado contra lo guardado:
 * - puede quitar miembros, cambiarles el rol (Editor/Viewer) y el departamento;
 * - NO puede añadir miembros ni cambiar a quién apunta uno (uid, email, nombre): solo entra
 *   alguien que aceptó una invitación. Así nadie mete a otra cuenta en su equipo para mandarle notas;
 * - puede añadir y cancelar invitaciones (no dan acceso hasta que se aceptan), pero no a su propio email.
 */
export function cleanTeam(saved: Team, incoming: { members: unknown[]; invites: unknown[] }, myEmail: string): Team {
  const byId = new Map(saved.members.map((m) => [m.id, m]));
  const members: Member[] = [];
  for (const raw of incoming.members) {
    const m = (raw ?? {}) as Record<string, unknown>;
    const cur = byId.get(str(m['id']));
    if (!cur) continue; // un miembro nuevo solo puede llegar aceptando una invitación
    if (cur.you) { members.push({ ...cur, dept: str(m['dept'], 80) }); continue; }
    members.push({ ...cur, role: role(m['role']), dept: str(m['dept'], 80) });
  }
  if (!members.some((m) => m.you)) { const me = saved.members.find((m) => m.you); if (me) members.unshift(me); }
  const taken = new Set([myEmail.toLowerCase(), ...members.map((m) => m.email.toLowerCase())]);
  const invites: Invite[] = [];
  for (const raw of incoming.invites) {
    const v = (raw ?? {}) as Record<string, unknown>;
    const email = str(v['email']).toLowerCase();
    if (!email || !email.includes('@') || taken.has(email)) continue;
    taken.add(email);
    invites.push({ id: str(v['id'], 64) || email, email, role: role(v['role']) });
  }
  return { members, invites };
}

/** Papel de una cuenta en el equipo de un dueño (null si no está). */
export function roleIn(ownerId: string, team: Team | undefined, uid: string): Role | null {
  if (ownerId === uid) return 'Owner';
  const m = team?.members.find((x) => x.uid === uid);
  return m ? m.role : null;
}

/** Cuentas que reciben una nota enviada al equipo de un dueño: el dueño y sus miembros aceptados, menos quien la envía. */
export function recipients(ownerId: string, team: Team | undefined, sender: string): string[] {
  const all = [ownerId, ...(team?.members ?? []).map((m) => m.uid).filter((x): x is string => !!x)];
  return [...new Set(all)].filter((x) => x !== sender);
}
