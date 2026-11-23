// Datos de ejemplo (inventados, como en el prototipo): Hollow Tides y Pixel Kitchen.
// Viven solo en memoria: al recargar la página se vuelve a este punto de partida.
import type { AppData, Block, Dept, Gdd, Section } from './models';

/** Identificador único: lo genera el front para poder guardar sin esperar al servidor. */
export const nid = (): string => crypto.randomUUID().replace(/-/g, '').slice(0, 20);

/** Catálogo de departamentos: [nombre, nº de bloques en la plantilla Minimal, bloques [nombre, para qué sirve]]. */
export const CATALOG: [string, number, [string, string][]][] = [
  ['Game design', 3, [['Concept', 'The idea in a few lines: genre, player fantasy and what makes your game different.'], ['Gameplay', 'How the game plays: core loop, rules and mechanics.'], ['Characters', 'Who the player controls and who they meet.'], ['Levels', 'The list of levels and what happens in each one.'], ['Controls', 'Every input and what it does.'], ['Progression', 'How the player grows and what they unlock.']]],
  ['Narrative', 2, [['Story', 'The plot from start to end, in a few paragraphs.'], ['World', 'Where and when the game happens, and its rules.'], ['Character arcs', 'How the main characters change along the story.'], ['Dialogue', 'Tone of voice and key lines.']]],
  ['Art', 2, [['Art direction', 'The visual style, with references and a colour palette.'], ['Character art', 'Designs and sheets for every character.'], ['Environments', 'The look of each area of the game.'], ['Props', 'Objects the player sees or uses.'], ['VFX', 'Visual effects and when they appear.']]],
  ['Animation', 2, [['Animation reference', 'Videos and references for each movement.'], ['Blockings', 'Key poses and timing, before splines and the final animation.'], ['Splines', 'Clean curves and in-betweens on top of the blockings.'], ['Final animation', 'Polished animation, ready for the engine.'], ['Animation library', 'Every animation in the game, with its name and frames.']]],
  ['Level design', 2, [['Level list', 'Every level, in order, with its goal.'], ['Layouts', 'Maps and blockouts of each level.'], ['Pacing', 'Where the game is calm and where it is intense.'], ['Puzzles', 'Each puzzle and how to solve it.']]],
  ['Programming', 2, [['Tech stack', 'Engine, tools and versions.'], ['Architecture', 'How the code is organised.'], ['Player controller', 'How the character moves and responds to input.'], ['Enemy AI', 'How enemies decide what to do.'], ['Save system', 'What the game saves and when.'], ['Build pipeline', 'How to make a build for each platform.']]],
  ['UI & UX', 2, [['HUD', 'What the player sees while playing.'], ['Menus', 'Every menu and how they connect.'], ['Accessibility', 'Options so more people can play.']]],
  ['Audio', 1, [['Music', 'Tracks and where they play.'], ['Sound effects', 'Every sound and what triggers it.'], ['Voice', 'Voice lines and who records them.']]],
  ['QA', 1, [['Test plan', 'What to test and how.'], ['Bug tracking', 'Where bugs are logged and how to report one.']]],
  ['Marketing', 1, [['Target audience', 'Who the game is for.'], ['Launch plan', 'Dates, platforms and channels.']]],
];

/** Icono de cada departamento (README del sistema de diseño · Iconografía). */
export const DEPT_ICON: Record<string, string> = {
  'Game design': 'casino', Narrative: 'auto_stories', Art: 'palette', Animation: 'animation', 'Level design': 'map',
  Programming: 'code', 'UI & UX': 'touch_app', Audio: 'music_note', QA: 'bug_report', Marketing: 'campaign',
};

export type Template = 'Detailed' | 'Minimal' | 'Blank';
export const TEMPLATE_DEPTS: Record<Template, number[]> = { Detailed: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], Minimal: [0, 2, 3, 5], Blank: [] };

export function mkSection(t = '', x = '', chg = ''): Section {
  return { id: nid(), t, x, rev: !!chg, chg, b: false, i: false, big: false };
}

export function mkBlock(name: string, purpose = ''): Block {
  return { id: nid(), name, purpose, status: 'Empty', pend: false, rem: null, secs: [mkSection()] };
}

/** Crea un GDD a partir de una plantilla y de los departamentos elegidos. */
export function buildGdd(name: string, tpl: Template, on: number[]): Gdd {
  return {
    id: nid(), name, desc: tpl + ' template', updated: 'Created today',
    depts: on.map((i): Dept => {
      const c = CATALOG[i];
      const bl = tpl === 'Detailed' ? c[2] : tpl === 'Minimal' ? c[2].slice(0, c[1]) : [];
      return { id: nid(), name: c[0], blocks: bl.map((x) => mkBlock(x[0], x[1])) };
    }),
  };
}

function fill(g: Gdd, dname: string, bname: string, secs: [string, string, string?][], status: Block['status'], extra?: Partial<Block>): Block {
  const dp = g.depts.find((x) => x.name === dname)!;
  const b = dp.blocks.find((x) => x.name === bname)!;
  b.secs = secs.map((s) => mkSection(s[0], s[1], s[2]));
  b.status = status;
  if (extra) Object.assign(b, extra);
  return b;
}

/** Próximo lunes, en formato AAAA-MM-DD. */
export function nextMonday(): string {
  const t = new Date();
  const add = (8 - t.getDay()) % 7 || 7;
  const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() + add);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function sampleData(): AppData {
  const ht = buildGdd('Hollow Tides', 'Detailed', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  ht.desc = '2D metroidvania';
  ht.updated = 'Updated today';
  fill(ht, 'Game design', 'Concept', [['Pitch', 'A young diver explores a sunken city to find out why it flooded.'], ['Player fantasy', 'Feel light and fast under water, but always one hit away from danger.']], 'Up to date');
  const gp = fill(ht, 'Game design', 'Gameplay', [
    ['Overview', 'Hollow Tides is a 2D metroidvania about a diver who explores a sunken city. Short sessions and precise controls.'],
    ['Core loop', 'Explore the flooded ruins, find relics, unlock abilities and open paths to deeper areas. Return to a lighthouse to save.'],
    ['Player character', 'Mara, a young diver. Light and fast, but fragile: after three hits she returns to the last lighthouse.'],
    ['Movement', 'Run: constant speed, no stamina.\nDash: short dash in 8 directions, 1 second cooldown.'],
    ['Jump', 'Jump height: 3 tiles. Double jump unlocks with the second relic.', 'Change: jump height is now 2 tiles (build 0.4). Update this part.'],
    ['Combat', 'Harpoon attack with a three-hit combo. Enemies show a short warning before they attack.'],
    ['Progression', 'Each relic unlocks one ability: dash, double jump and sonar.'],
  ], 'Out of date');
  const ch = fill(ht, 'Game design', 'Characters', [['Mara', 'The diver. Curious and stubborn.'], ['The Keeper', 'An old lighthouse keeper who guides Mara.']], 'Up to date');
  const lv = fill(ht, 'Game design', 'Levels', [['Level list', 'Lighthouse, Flooded market, Coral cathedral, The Deep.']], 'Out of date', { pend: true });
  fill(ht, 'Art', 'Art direction', [['Style', 'Hand-painted backgrounds, soft light from above, cold blues for deep water.']], 'Up to date');
  fill(ht, 'Animation', 'Animation reference', [['Run', 'Reference video: swimmer push-off, 12 frames.'], ['Jump', 'Reference video: diving board take-off.']], 'Up to date');
  const bk = fill(ht, 'Animation', 'Blockings', [
    ['Run cycle', 'Blocked at 12 frames per cycle. Contact poses on frames 1 and 7.'],
    ['Jump', 'Anticipation: 4 frames. Airtime: 14 frames. Landing: 6 frames.', 'Change: jump height is now 2 tiles (build 0.4). Shorten the airtime.'],
    ['Dash', 'Start, stretch and stop poses. 8 frames in total.'],
    ['Idle', 'Breathing loop of 48 frames, with a small head turn.'],
    ['Hit and death', 'Hit reaction: 10 frames. Death: 24 frames, ending on the ground.'],
  ], 'Out of date', { rem: { date: nextMonday(), time: '10:00', rep: 'Every month', who: 'Me' } });
  fill(ht, 'Animation', 'Animation library', [['Mara', 'run_01, jump_01, dash_01, idle_01, hit_01, death_01']], 'Up to date');
  const anim = ht.depts.find((x) => x.name === 'Animation')!;

  const pk: Gdd = {
    id: nid(), name: 'Pixel Kitchen', desc: 'Cooking puzzle game', updated: 'Updated 2 days ago',
    depts: [
      { id: nid(), name: 'Game design', blocks: [mkBlock('Concept', 'The idea in a few lines.'), mkBlock('Recipes', 'Every recipe, its steps and its timing.'), mkBlock('Gameplay', 'How the game plays.')] },
      { id: nid(), name: 'Art', blocks: [mkBlock('Art direction', 'The visual style.'), mkBlock('Sprites', 'Every sprite sheet and its frames.')] },
      { id: nid(), name: 'Programming', blocks: [mkBlock('Tech stack', 'Engine, tools and versions.')] },
    ],
  };
  fill(pk, 'Game design', 'Concept', [['Pitch', 'Run a tiny kitchen where every recipe is a puzzle.']], 'Up to date');
  const rc = fill(pk, 'Game design', 'Recipes', [['Soup', 'Chop, boil, serve. 3 steps.'], ['Pie', 'Dough, filling, oven. Oven time changed.', 'Change: oven time is now 20 seconds. Update the pie steps.']], 'Out of date');
  const art = pk.depts.find((x) => x.name === 'Art')!;
  const spr = fill(pk, 'Art', 'Sprites', [['Oven', 'Idle, cooking and burnt states.']], 'Up to date');

  ht.last = { dp: anim.id, b: bk.id, when: 'Edited 2 h ago' };
  pk.last = { dp: pk.depts[0].id, b: rc.id, when: 'Edited 2 days ago' };

  return {
    gdds: [ht, pk],
    notes: [
      { id: nid(), kind: 'change', g: ht.id, title: 'Blockings may be out of date', path: 'Animation › Blockings', when: 'Today', ts: 50, unread: true, aff: [ch.id, gp.id, bk.id, lv.id], rvd: [ch.id] },
      { id: nid(), kind: 'team', g: ht.id, dp: anim.id, b: bk.id, title: '“Jump height changed. Check the jump timing.”', path: 'From: Game design', by: 'Marc', when: 'Yesterday', ts: 40, unread: true },
      { id: nid(), kind: 'change', g: pk.id, title: 'Recipes may be out of date', path: 'Game design › Recipes', when: '2 days ago', ts: 30, unread: false, aff: [rc.id], rvd: [] },
      { id: nid(), kind: 'team', g: pk.id, dp: art.id, b: spr.id, title: '“New oven sprites are ready.”', path: 'From: Art', by: 'Lena', when: 'Last week', ts: 20, unread: false },
    ],
    sent: [{ id: nid(), g: ht.id, text: 'Run cycle is ready for review.', to: 'Game design', when: '2 days ago', ts: 30 }],
    user: { name: 'Noa', user: 'noa', email: 'noa@example.com', av: 'account', phone: '', country: 'Spain', tz: 'Madrid (UTC+1)', lang: 'English', theme: 'Light', accent: 'Blue' },
    team: {
      members: [
        { id: nid(), name: 'Noa', email: 'noa@example.com', dept: 'Animation', role: 'Owner', you: true },
        { id: nid(), name: 'Marc', email: 'marc@example.com', dept: 'Game design', role: 'Editor', you: false },
        { id: nid(), name: 'Lena', email: 'lena@example.com', dept: 'Art', role: 'Viewer', you: false },
      ],
      invites: [{ id: nid(), email: 'ivo@example.com', role: 'Viewer' }],
    },
  };
}
