import { describe, expect, it } from 'vitest';

import { type Team, accessIn, cleanTeam, deptEditAllowed, markOutOfDate, recipients, roleIn } from './team.js';

const saved: Team = {
  members: [
    { id: 'me', name: 'Ana', email: 'ana@example.com', dept: '', role: 'Owner', you: true },
    { id: 'u2', uid: 'u2', name: 'Bea', email: 'bea@example.com', dept: 'Art', role: 'Editor' },
  ],
  invites: [{ id: 'i1', email: 'cris@example.com', role: 'Viewer' }],
};

describe('cleanTeam', () => {
  it('deja cambiar rol y departamento de un miembro aceptado, pero no a quién apunta', () => {
    const t = cleanTeam(saved, { members: [saved.members[0], { id: 'u2', uid: 'otra', email: 'x@x.com', name: 'X', role: 'Viewer', dept: 'Audio' }], invites: [] }, 'ana@example.com');
    expect(t.members[1]).toEqual({ id: 'u2', uid: 'u2', name: 'Bea', email: 'bea@example.com', dept: 'Audio', role: 'Viewer' });
  });

  it('no deja añadir miembros sin invitación aceptada', () => {
    const t = cleanTeam(saved, { members: [...saved.members, { id: 'u9', uid: 'u9', name: 'Intrusa', email: 'i@example.com', role: 'Editor' }], invites: [] }, 'ana@example.com');
    expect(t.members.map((m) => m.id)).toEqual(['me', 'u2']);
  });

  it('nadie se convierte en Owner y el dueño no se puede quitar', () => {
    const t = cleanTeam(saved, { members: [{ id: 'u2', role: 'Owner' }], invites: [] }, 'ana@example.com');
    expect(t.members.map((m) => [m.id, m.role])).toEqual([['me', 'Owner'], ['u2', 'Editor']]);
  });

  it('quitar un miembro', () => {
    expect(cleanTeam(saved, { members: [saved.members[0]], invites: [] }, 'ana@example.com').members).toHaveLength(1);
  });

  it('invitaciones: en minúsculas, sin repetir, sin el propio email ni miembros', () => {
    const t = cleanTeam(saved, { members: saved.members, invites: [{ id: 'a', email: 'Cris@Example.com', role: 'Viewer' }, { id: 'b', email: 'cris@example.com' }, { id: 'c', email: 'ana@example.com' }, { id: 'd', email: 'bea@example.com' }, { id: 'e', email: 'mal' }] }, 'ana@example.com');
    expect(t.invites).toEqual([{ id: 'a', email: 'cris@example.com', role: 'Viewer' }]);
  });
});

describe('roleIn y recipients', () => {
  it('papel de cada cuenta', () => {
    expect(roleIn('me', saved, 'me')).toBe('Owner');
    expect(roleIn('me', saved, 'u2')).toBe('Editor');
    expect(roleIn('me', saved, 'cris')).toBeNull(); // invitada pero sin aceptar: nada
  });

  it('una nota llega al dueño y a los miembros aceptados, no a quien la envía ni a invitaciones', () => {
    expect(recipients('me', saved, 'u2')).toEqual(['me']);
    expect(recipients('me', saved, 'me')).toEqual(['u2']);
  });
});

describe('markOutOfDate', () => {
  it('marca solo los bloques pedidos que existen, sin tocar el resto', () => {
    const depts = [{ id: 'd1', name: 'Art', blocks: [{ id: 'b1', status: 'Up to date', pend: false, secs: [{ x: 'hola' }] }, { id: 'b2', status: 'Empty', pend: false }] }];
    const r = markOutOfDate(depts, ['b1', 'no-existe']);
    expect(r.marked).toEqual(['b1']);
    expect(r.depts[0]['blocks']).toEqual([{ id: 'b1', status: 'Out of date', pend: true, secs: [{ x: 'hola' }] }, { id: 'b2', status: 'Empty', pend: false }]);
    expect(depts[0].blocks[0].status).toBe('Up to date'); // no cambia el original
  });
});

describe('acceso por proyecto y departamento (grants)', () => {
  const team: Team = {
    members: [
      { id: 'me', name: 'Ana', email: 'ana@example.com', dept: '', role: 'Owner', you: true },
      { id: 'u2', uid: 'u2', name: 'Bea', email: 'bea@example.com', dept: '', role: 'Editor' }, // de antes: sin grants = todo
      { id: 'u3', uid: 'u3', name: 'Cris', email: 'cris@example.com', dept: '', role: 'Editor', grants: [{ g: 'g1', role: 'Editor', depts: ['art'] }, { g: 'g2', role: 'Viewer', depts: ['audio'] }] },
    ],
    invites: [],
  };

  it('accessIn: dueño, persona de antes (todo) y grants por proyecto', () => {
    expect(accessIn('me', team, 'me', 'g9')).toEqual({ role: 'Owner', depts: [] });
    expect(accessIn('me', team, 'u2', 'g9')).toEqual({ role: 'Editor', depts: [] });
    expect(accessIn('me', team, 'u3', 'g1')).toEqual({ role: 'Editor', depts: ['art'] });
    expect(accessIn('me', team, 'u3', 'g2')).toEqual({ role: 'Viewer', depts: ['audio'] });
    expect(accessIn('me', team, 'u3', 'g9')).toBeNull(); // no le dieron ese proyecto
  });

  it('recipients: por proyecto y «a un departamento»', () => {
    expect(recipients('me', team, 'me', 'g1')).toEqual(['u2', 'u3']);
    expect(recipients('me', team, 'me', 'g9')).toEqual(['u2']);
    expect(recipients('me', team, 'u2', 'g2', 'audio')).toEqual(['me', 'u3']); // dueño + quien tiene Audio
    expect(recipients('me', team, 'me', 'g1', 'audio')).toEqual([]);
  });

  it('cleanTeam: grants solo a GDDs del dueño, sin repetir; el rol de la lista se resume', () => {
    const t = cleanTeam(team, { members: [team.members[0], { id: 'u3', grants: [{ g: 'g1', role: 'Viewer', depts: ['art', 'art'] }, { g: 'g1', role: 'Editor' }, { g: 'ajeno', role: 'Editor' }] }], invites: [{ id: 'i', email: 'dani@example.com', grants: [{ g: 'g2', role: 'Viewer' }] }] }, 'ana@example.com', new Set(['g1', 'g2']));
    expect(t.members[1].grants).toEqual([{ g: 'g1', role: 'Viewer', depts: ['art'] }]);
    expect(t.members[1].role).toBe('Viewer');
    expect(t.invites[0]).toEqual({ id: 'i', email: 'dani@example.com', role: 'Viewer', grants: [{ g: 'g2', role: 'Viewer', depts: [] }] });
  });

  it('deptEditAllowed: solo bloques de sus departamentos; nada de la lista de departamentos', () => {
    const cur = [{ id: 'art', name: 'Art', blocks: [{ id: 'b1', x: '' }] }, { id: 'audio', name: 'Audio', blocks: [{ id: 'b2', x: '' }] }];
    const edit = (f: (d: typeof cur) => void) => { const n = structuredClone(cur); f(n); return deptEditAllowed(cur, n, ['art']); };
    expect(edit((n) => { n[0].blocks[0].x = 'nuevo'; n[0].blocks.push({ id: 'b3', x: '' }); })).toBe(true);
    expect(edit((n) => { n[1].blocks[0].x = 'no'; })).toBe(false);
    expect(edit((n) => { n[0].name = 'Arte'; })).toBe(false);
    expect(edit((n) => { n.reverse(); })).toBe(false);
    expect(edit((n) => { n.pop(); })).toBe(false);
    expect(deptEditAllowed(cur, [{ blocks: cur[0].blocks, name: 'Art', id: 'art' }, cur[1]], ['art'])).toBe(true); // mismo contenido, otro orden de campos
  });
});
