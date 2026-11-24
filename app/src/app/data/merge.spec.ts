import { describe, expect, it } from 'vitest';

import { mergeGdd } from './merge';
import type { Gdd } from './models';

const sec = (id: string, x: string) => ({ id, t: '', x, rev: false, chg: '', big: false, b: false, i: false });
const blk = (id: string, name: string, x = '') => ({ id, name, status: 'Empty', pend: false, secs: [sec(id + 's', x)] });
const base: Gdd = {
  id: 'g', name: 'Juego', desc: '', updated: '', rev: 3,
  depts: [
    { id: 'd1', name: 'Art', blocks: [blk('b1', 'Style'), blk('b2', 'Mood')] },
    { id: 'd2', name: 'Audio', blocks: [blk('b3', 'Music')] },
  ],
} as unknown as Gdd;
const copy = (): Gdd => structuredClone(base);
const text = (g: Gdd, bid: string) => g.depts.flatMap((d) => d.blocks).find((b) => b.id === bid)?.secs[0].x;

describe('mergeGdd', () => {
  it('cada persona escribe un bloque distinto: se quedan los dos', () => {
    const mine = copy(); mine.depts[0].blocks[0].secs[0].x = 'mío';
    const theirs = copy(); theirs.rev = 4; theirs.depts[1].blocks[0].secs[0].x = 'suyo';
    const g = mergeGdd(base, mine, theirs);
    expect([text(g, 'b1'), text(g, 'b3'), g.rev]).toEqual(['mío', 'suyo', 4]);
  });

  it('la otra persona añade un bloque y yo borro otro', () => {
    const mine = copy(); mine.depts[0].blocks = mine.depts[0].blocks.filter((b) => b.id !== 'b2');
    const theirs = copy(); theirs.depts[0].blocks.push(blk('b9', 'Nuevo') as never);
    expect(mergeGdd(base, mine, theirs).depts[0].blocks.map((b) => b.id)).toEqual(['b1', 'b9']);
  });

  it('borro un bloque que la otra persona acaba de cambiar: no se pierde su texto', () => {
    const mine = copy(); mine.depts[0].blocks = mine.depts[0].blocks.filter((b) => b.id !== 'b2');
    const theirs = copy(); theirs.depts[0].blocks[1].secs[0].x = 'importante';
    expect(text(mergeGdd(base, mine, theirs), 'b2')).toBe('importante');
  });

  it('yo añado un departamento y la otra persona renombra otro', () => {
    const mine = copy(); mine.depts.splice(1, 0, { id: 'd3', name: 'UI', blocks: [] } as never);
    const theirs = copy(); theirs.depts[1].name = 'Sound';
    const g = mergeGdd(base, mine, theirs);
    expect(g.depts.map((d) => d.name)).toEqual(['Art', 'UI', 'Sound']);
  });

  it('yo reordeno los departamentos y la otra persona escribe: valen las dos cosas', () => {
    const mine = copy(); mine.depts.reverse();
    const theirs = copy(); theirs.depts[0].blocks[0].secs[0].x = 'suyo';
    const g = mergeGdd(base, mine, theirs);
    expect([g.depts.map((d) => d.id), text(g, 'b1')]).toEqual([['d2', 'd1'], 'suyo']);
  });

  it('los dos cambiamos la misma sección: gana la mía; el nombre del bloque que cambió la otra se queda', () => {
    const mine = copy(); mine.depts[0].blocks[0].secs[0].x = 'mío';
    const theirs = copy(); theirs.depts[0].blocks[0].secs[0].x = 'suyo'; theirs.depts[0].blocks[0].name = 'Art style';
    const g = mergeGdd(base, mine, theirs);
    expect([text(g, 'b1'), g.depts[0].blocks[0].name]).toEqual(['mío', 'Art style']);
  });
});
