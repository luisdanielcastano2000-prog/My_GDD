// Reglas del equipo en el servidor, con tres cuentas: Ana (dueña), Bea (Editor) y Cris (Viewer).
// Solo API (sin pantallas): invitar, aceptar, permisos, versiones (409), notas, salir y borrar.
import { type APIRequestContext, expect, test } from '@playwright/test';

import { email, runId, signupApi } from './helpers';

test.describe.configure({ mode: 'serial' });

type Json = Record<string, any>;  
const run = runId();
const G = 'g-' + run;
const gdd = { name: 'Juego', order: 0, depts: [{ id: 'd1', name: 'Art', blocks: [{ id: 'b1', name: 'Style', secs: [] }] }] };
let rq: APIRequestContext;
let ana = '', bea = '', cris = '', anaId = '';

async function call(token: string, method: string, path: string, data?: unknown): Promise<{ s: number; r: Json }> {
  const res = await rq.fetch(path, { method, data, headers: { Authorization: 'Bearer ' + token } });
  return { s: res.status(), r: (await res.json().catch(() => null)) as Json };
}
const me = async (t: string): Promise<Json> => (await call(t, 'GET', '/api/me')).r;

test.beforeAll(async ({ playwright, baseURL }) => {
  rq = await playwright.request.newContext({ baseURL });
  ana = await signupApi(rq, 'ana', run);
  bea = await signupApi(rq, 'bea', run);
  cris = await signupApi(rq, 'cris', run);
});
test.afterAll(async () => {
  for (const t of [ana, bea, cris]) await call(t, 'DELETE', '/api/me').catch(() => null);
  await rq.dispose();
});

test('invitar no da acceso ni notas hasta aceptar (y no se mete a nadie a mano)', async () => {
  expect((await call(ana, 'PUT', `/api/gdds/${G}`, gdd)).r['rev']).toBe(1);
  const team = (await me(ana))['team'];
  team.invites = [{ id: 'i1', email: email('bea', run), role: 'Editor' }, { id: 'i2', email: email('cris', run), role: 'Viewer' }, { id: 'i3', email: email('ana', run), role: 'Editor' }];
  team.members.push({ id: 'x', uid: 'intrusa', name: 'X', email: 'x@example.com', role: 'Editor' });
  const saved = (await call(ana, 'PUT', '/api/me/team', team)).r['team'];
  expect(saved.invites.map((v: Json) => v['email'])).toEqual([email('bea', run), email('cris', run)]);
  expect(saved.members).toHaveLength(1);

  const mb = await me(bea);
  expect(mb['gdds']).toEqual([]);
  expect(mb['invitations']).toEqual([expect.objectContaining({ name: 'Ana', role: 'Editor' })]);
  anaId = mb['invitations'][0].owner;
  expect((await call(bea, 'PUT', `/api/gdds/${G}`, gdd)).s).toBe(404);
  expect((await call(ana, 'PUT', '/api/notes/n1-' + run, { box: 'sent', data: { g: G, text: 'Hola', to: 'Whole team', ts: 1 } })).r['delivered']).toBe(0);
});

test('aceptar: Bea Editor y Cris Viewer ven el GDD', async () => {
  expect((await call(bea, 'POST', `/api/teams/${anaId}/accept`)).s).toBe(200);
  expect((await call(cris, 'POST', `/api/teams/${anaId}/accept`)).s).toBe(200);
  expect((await call(bea, 'POST', `/api/teams/${anaId}/accept`)).s).toBe(404); // ya no hay invitación
  const ta = (await me(ana))['team'];
  expect(ta.members.map((m: Json) => [m['name'], m['role']])).toEqual([['Ana', 'Owner'], ['Bea', 'Editor'], ['Cris', 'Viewer']]);
  expect(ta.invites).toEqual([]);
  expect((await me(bea))['gdds'].map((g: Json) => [g['id'], g['share'].role])).toEqual([[G, 'Editor']]);
  expect((await me(cris))['gdds'][0].share.role).toBe('Viewer');
});

test('permisos y versiones: Editor escribe (no renombra), 409 al pisar, Viewer 403, nadie más borra', async () => {
  const g2 = { ...gdd, name: 'Renombrado por Bea', rev: 1, depts: [{ id: 'd1', name: 'Art', blocks: [{ id: 'b1', name: 'Style', secs: [{ id: 's1', x: 'texto de Bea' }] }] }] };
  expect((await call(bea, 'PUT', `/api/gdds/${G}`, g2)).r['rev']).toBe(2);
  expect((await me(ana))['gdds'][0].name).toBe('Juego');
  const old = await call(ana, 'PUT', `/api/gdds/${G}`, { ...gdd, rev: 1 });
  expect(old.s).toBe(409);
  expect(old.r['gdd'].rev).toBe(2);
  expect(old.r['gdd'].depts[0].blocks[0].secs[0].x).toBe('texto de Bea');
  const v = await call(cris, 'PUT', `/api/gdds/${G}`, { ...gdd, rev: 2 });
  expect([v.s, v.r['message']]).toEqual([403, 'You can only read this GDD.']);
  await call(cris, 'DELETE', `/api/gdds/${G}`);
  await call(bea, 'DELETE', `/api/gdds/${G}`);
  expect((await me(ana))['gdds']).toHaveLength(1);
});

test('una nota del Viewer llega a Ana y Bea, en el grupo del GDD', async () => {
  expect((await call(cris, 'PUT', '/api/notes/n2-' + run, { box: 'sent', data: { g: G, text: 'Revisad el estilo', to: 'Whole team', ts: 1 } })).r['delivered']).toBe(2);
  const n = (await me(ana))['notes'].find((x: Json) => String(x['title']).includes('Revisad'));
  expect([n.g, n.path]).toEqual([G, 'From: Cris']);
});

test('quitar, cambiar nombre, salir, rechazar y borrar la cuenta', async () => {
  const team = (await me(ana))['team'];
  team.members = team.members.filter((m: Json) => m['name'] !== 'Cris');
  await call(ana, 'PUT', '/api/me/team', team);
  expect((await me(cris))['gdds']).toEqual([]);
  expect((await call(cris, 'PUT', `/api/gdds/${G}`, { ...gdd, rev: 2 })).s).toBe(404);

  await call(bea, 'PATCH', '/api/me', { name: 'Beatriz' });
  expect((await me(ana))['team'].members.map((m: Json) => m['name'])).toEqual(['Ana', 'Beatriz']);
  expect((await call(bea, 'POST', `/api/teams/${anaId}/leave`)).s).toBe(200);
  expect((await me(bea))['gdds']).toEqual([]);

  const t2 = (await me(ana))['team'];
  t2.invites = [{ id: 'i4', email: email('cris', run), role: 'Editor' }];
  await call(ana, 'PUT', '/api/me/team', t2);
  await call(cris, 'POST', `/api/teams/${anaId}/decline`);
  expect((await me(cris))['invitations']).toEqual([]);
  expect((await me(ana))['team'].invites).toEqual([]);

  const t3 = (await me(ana))['team'];
  t3.invites = [{ id: 'i5', email: email('bea', run), role: 'Editor' }];
  await call(ana, 'PUT', '/api/me/team', t3);
  await call(bea, 'POST', `/api/teams/${anaId}/accept`);
  await call(bea, 'DELETE', '/api/me');
  bea = '';
  expect((await me(ana))['team'].members.map((m: Json) => m['name'])).toEqual(['Ana']);
});
