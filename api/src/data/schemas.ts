// Forma de los datos en MongoDB (base my_gdd).
// Un GDD se guarda como UN documento, con sus departamentos, bloques y secciones dentro:
// así el front lo lee y lo guarda de una vez, igual que lo maneja en memoria.
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

/** Una cuenta: perfil, ajustes y equipo. La contraseña se guarda cifrada (bcrypt), nunca tal cual. */
@Schema({ collection: 'users', timestamps: true, versionKey: false })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true }) email: string;
  @Prop({ required: true }) passwordHash: string;
  @Prop({ required: true, trim: true }) name: string;
  @Prop({ required: true, trim: true }) user: string;
  @Prop({ default: 'account' }) av: string;
  @Prop({ default: '' }) phone: string;
  @Prop({ default: '' }) country: string;
  @Prop({ default: '' }) tz: string;
  @Prop({ default: 'English' }) lang: string;
  @Prop({ default: 'Light' }) theme: string;
  @Prop({ default: 'Blue' }) accent: string;
  /** Ajustes de accesibilidad (tamaño de texto, alto contraste, menos movimiento…). */
  @Prop({ type: Object, default: {} }) settings: Record<string, unknown>;
  /** Equipo: personas (members) e invitaciones pendientes (invites). */
  /** El email está verificado (enlace del correo de bienvenida). */
  @Prop({ default: false }) emailVerified: boolean;
  /** Versión de sesión: al subirla, los tokens antiguos dejan de valer (cambiar contraseña, «Log out of other devices»). */
  @Prop({ default: 0 }) tv: number;
  @Prop({ type: Object, default: () => ({ members: [], invites: [] }) }) team: { members: Record<string, unknown>[]; invites: Record<string, unknown>[] };
}
export type UserDoc = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);

/** Un GDD. _id lo genera el front (texto) para poder guardar sin esperar a la base de datos. */
@Schema({ collection: 'gdds', timestamps: true, versionKey: false })
export class Gdd {
  @Prop({ type: String, required: true }) _id: string;
  @Prop({ required: true, index: true }) owner: string;
  @Prop({ required: true, trim: true }) name: string;
  @Prop({ default: '' }) desc: string;
  @Prop({ default: '' }) updated: string;
  @Prop() cts?: number; // cuándo se creó (ms, lo pone el front)
  @Prop() uts?: number; // cuándo cambió por última vez (ms)
  @Prop() rev?: number; // versión: sube en cada guardado (evita que dos personas se pisen)
  @Prop({ default: 0 }) order: number; // posición en el carrusel de Home
  @Prop({ type: [Object], default: [] }) depts: Record<string, unknown>[];
  @Prop({ type: Object, default: null }) last: Record<string, unknown> | null;
}
export const GddSchema = SchemaFactory.createForClass(Gdd);

/** Una nota: recibida (kind change/team) o enviada (box sent). */
@Schema({ collection: 'notes', timestamps: true, versionKey: false })
export class Note {
  @Prop({ type: String, required: true }) _id: string;
  @Prop({ required: true, index: true }) owner: string;
  @Prop({ required: true, enum: ['received', 'sent'] }) box: string;
  /** El resto de campos de la nota tal como los usa el front (title, text, to, when, ts…). */
  @Prop({ type: Object, required: true }) data: Record<string, unknown>;
}
export const NoteSchema = SchemaFactory.createForClass(Note);

/** Un mensaje de «Send feedback» (se lee en Atlas, colección feedback). */
@Schema({ collection: 'feedback', timestamps: true, versionKey: false })
export class Feedback {
  @Prop({ required: true }) owner: string;
  @Prop({ required: true }) email: string;
  @Prop({ required: true, enum: ['Idea', 'Problem', 'Question'] }) topic: string;
  @Prop({ required: true }) text: string;
  @Prop({ default: true }) reply: boolean;
}
export const FeedbackSchema = SchemaFactory.createForClass(Feedback);

/**
 * Enlaces de un solo uso que se mandan por email (verificar la cuenta, crear una contraseña nueva,
 * confirmar un email nuevo). Se guarda el sha256 del enlace, nunca el enlace. Mongo borra los caducados solo.
 */
@Schema({ collection: 'tokens', versionKey: false })
export class MailToken {
  @Prop({ type: String, required: true }) _id: string; // sha256 del token
  @Prop({ required: true, index: true }) uid: string;
  @Prop({ required: true, enum: ['verify', 'reset', 'email'] }) kind: string;
  @Prop() email?: string; // el email nuevo (kind 'email')
  @Prop({ required: true, expires: 0 }) exp: Date; // índice TTL: se borra al caducar
}
export const MailTokenSchema = SchemaFactory.createForClass(MailToken);

/** Correos «enviados» cuando no hay servicio de correo (solo en el Mac y en las pruebas). */
@Schema({ collection: 'outbox', timestamps: true, versionKey: false })
export class Outbox {
  @Prop({ required: true, index: true }) to: string;
  @Prop({ required: true }) subject: string;
  @Prop({ required: true }) text: string;
  @Prop() link?: string;
}
export const OutboxSchema = SchemaFactory.createForClass(Outbox);
