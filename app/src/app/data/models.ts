// Forma de los datos de My GDD (la misma que usa el prototipo de claude.ai).

export type BlockStatus = 'Empty' | 'Up to date' | 'Out of date';

/** Una sección del documento de un bloque: título + texto. */
export interface Section {
  id: string;
  t: string; // título
  x: string; // texto
  rev: boolean; // necesita revisión
  chg: string; // descripción del cambio que obliga a revisarla
  b: boolean; // negrita
  i: boolean; // cursiva
  big: boolean; // texto grande
}

export interface Reminder {
  date: string; // AAAA-MM-DD
  time: string; // HH:MM
  rep: 'Once' | 'Every week' | 'Every month';
  who: 'Me' | 'The team';
}

/** Un bloque del GDD (p. ej. «Gameplay»): vive dentro de un departamento. */
export interface Block {
  id: string;
  name: string;
  purpose: string; // «What it's for»
  status: BlockStatus;
  pend: boolean; // afectado por el último cambio, sin revisar
  rem: Reminder | null;
  secs: Section[];
}

export interface Dept {
  id: string;
  name: string;
  blocks: Block[];
  col?: number; // color de departamento (1–6)
}

export interface Gdd {
  id: string;
  name: string;
  desc: string;
  updated: string; // texto fijo (datos de ejemplo); con cts/uts se calcula «hace cuánto»
  cts?: number; // cuándo se creó (ms)
  uts?: number; // cuándo cambió por última vez (ms)
  rev?: number; // versión en el servidor (sube en cada guardado)
  share?: Share; // solo en GDDs de otra persona que te invitó a su equipo
  depts: Dept[];
  last?: { dp: string; b: string; when: string; ts?: number }; // último bloque editado
}

export type Role = 'Owner' | 'Editor' | 'Viewer';

/** Un GDD de otra persona: de quién es y qué puedes hacer (Editor: escribir; Viewer: solo leer). */
export interface Share {
  owner: string; // id de la cuenta dueña
  name: string; // su nombre
  role: 'Editor' | 'Viewer';
}

/** Una invitación que te han hecho a un equipo (se acepta o se rechaza). */
export interface Invitation {
  owner: string;
  name: string;
  role: 'Editor' | 'Viewer';
}

/** Un equipo de otra persona en el que estás. */
export interface TeamRef {
  owner: string;
  name: string;
  role: 'Editor' | 'Viewer';
}

/** Nota recibida: un cambio en el GDD o una nota del equipo. */
export interface Note {
  id: string;
  kind: 'change' | 'team';
  g: string;
  dp?: string;
  b?: string;
  title: string;
  path: string;
  by?: string;
  when: string;
  ts: number;
  unread: boolean;
  aff?: string[]; // bloques afectados (cambios)
  rvd?: string[]; // bloques ya revisados
}

export interface SentNote {
  id: string;
  g?: string;
  dp?: string; // departamento y bloque de donde sale la nota (si los hay)
  b?: string;
  aff?: string[]; // bloques que esta nota marcó como «Out of date» (los marca el servidor)
  text: string;
  to: string;
  when: string;
  ts: number;
}

export interface User {
  name: string;
  user: string;
  email: string;
  av: AvatarKey;
  phone: string;
  country: string;
  tz: string;
  lang: string;
  theme: 'Light' | 'Dark' | 'System';
  accent: string;
}

export type AvatarKey = 'account' | 'game' | 'palette' | 'movie' | 'code' | 'music';

export interface Member {
  id: string;
  uid?: string; // id de la cuenta (personas que aceptaron la invitación)
  name: string;
  email: string;
  dept: string;
  role: 'Owner' | 'Editor' | 'Viewer';
  you: boolean;
}

export interface Invite {
  id: string;
  email: string;
  role: 'Editor' | 'Viewer';
}

export interface AppData {
  gdds: Gdd[];
  notes: Note[];
  sent: SentNote[];
  user: User;
  team: { members: Member[]; invites: Invite[] };
}

// ---------- capas que se abren encima de la pantalla ----------

export type Sheet =
  | { k: 'act'; what: 'gdd' | 'dept' | 'block'; id: string; g?: string; dp?: string }
  | { k: 'note'; kind: 'change' | 'team' | 'sent'; id: string; title: string }
  | { k: 'avatar'; av: AvatarKey }
  | { k: 'manage'; id: string; role: 'Editor' | 'Viewer' | 'Owner' }
  | { k: 'invite'; email: string; role: 'Editor' | 'Viewer'; err: boolean; busy?: 'load' | 'ok' };

export type Dialog =
  | { k: 'rename'; what: 'gdd' | 'dept' | 'block' | 'field'; id?: string; g?: string; dp?: string; key?: 'phone' | 'country' | 'tz'; label?: string; val: string; err: boolean }
  | { k: 'del'; what: 'gdd' | 'member' | 'account'; id?: string };

export interface Snack {
  id: number;
  msg: string;
  undo?: boolean; // muestra «Undo»
  kind?: '' | 'ok' | 'err';
  action?: { label: string; run: () => void };
}

export const AVATAR_ICON: Record<AvatarKey, string> = {
  account: 'account_circle',
  game: 'sports_esports',
  palette: 'palette',
  movie: 'movie',
  code: 'code',
  music: 'music_note',
};

export const AVATAR_NAME: Record<AvatarKey, string> = {
  account: 'Person',
  game: 'Controller',
  palette: 'Palette',
  movie: 'Film',
  code: 'Code',
  music: 'Music',
};
