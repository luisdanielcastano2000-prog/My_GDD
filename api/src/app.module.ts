import { join } from 'node:path';

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';

import { AuthController } from './auth/auth.controller.js';
import { AuthGuard } from './auth/auth.guard.js';
import { GddsController, MeController, NotesController } from './data/data.controller.js';
import { Gdd, GddSchema, Note, NoteSchema, User, UserSchema } from './data/schemas.js';

// Ajustes que da el servidor al arrancar (variables de entorno). Si faltan, valores para el Mac:
// - MONGODB_URI: dirección de MongoDB (en Render: la cadena de Atlas, con la contraseña; nunca en el código).
// - JWT_SECRET: clave para firmar los tokens de sesión (en Render: un valor largo y secreto).
const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017';
const JWT_SECRET = process.env.JWT_SECRET ?? 'solo-para-desarrollo-local';
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) throw new Error('Falta la variable JWT_SECRET');

@Module({
  imports: [
    MongooseModule.forRoot(MONGODB_URI, { dbName: 'my_gdd' }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Gdd.name, schema: GddSchema },
      { name: Note.name, schema: NoteSchema },
    ]),
    JwtModule.register({ global: true, secret: JWT_SECRET, signOptions: { expiresIn: '7d' } }),
    // La web compilada (app/www) se sirve desde el mismo servidor: una sola dirección, sin CORS.
    ServeStaticModule.forRoot({ rootPath: join(import.meta.dirname, '..', '..', 'app', 'www'), exclude: ['/api/{*any}'] }),
  ],
  controllers: [AuthController, MeController, GddsController, NotesController],
  providers: [AuthGuard],
})
export class AppModule {}
