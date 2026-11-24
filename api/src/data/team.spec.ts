import { describe, expect, it } from 'vitest';

import { type Team, cleanTeam, markOutOfDate, recipients, roleIn } from './team.js';

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
