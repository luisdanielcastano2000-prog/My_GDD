// Reglas de los datos que llegan (la misma validación que el formulario del front: el front se puede saltar).
import { IsBoolean, IsEmail, IsIn, IsObject, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SignupDto {
  @IsString() @MinLength(1, { message: 'Enter a user name.' }) @MaxLength(40) user: string;
  @IsEmail({}, { message: 'Enter an email address, for example name@example.com.' }) email: string;
  @IsString() @MinLength(8, { message: 'The password needs at least 8 characters.' }) @MaxLength(200) password: string;
}

export class EmailDto {
  @IsEmail({}, { message: 'Enter an email address, for example name@example.com.' }) email: string;
}

export class TokenDto {
  @IsString() @MinLength(10) @MaxLength(200) token: string;
}

export class ResetDto {
  @IsString() @MinLength(10) @MaxLength(200) token: string;
  @IsString() @MinLength(8, { message: 'The password needs at least 8 characters.' }) @MaxLength(200) password: string;
}

export class LoginDto {
  @IsString() email: string;
  @IsString() password: string;
  /** Identificador de este navegador (lo crea el front y lo guarda): para no pedir código en un aparato de confianza. */
  @IsOptional() @IsString() @MaxLength(100) device?: string;
}

export class CodeDto {
  @IsString() @MinLength(10) @MaxLength(200) ticket: string;
  @IsString() @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code.' }) code: string;
  @IsOptional() @IsString() @MaxLength(100) device?: string;
}

export class TwoStepDto {
  @IsBoolean() on: boolean;
  @IsOptional() @IsString() @MaxLength(100) device?: string;
}

export class DeviceDto {
  @IsOptional() @IsString() @MaxLength(100) device?: string;
}

export class ProfileDto {
  @IsOptional() @IsString() @MinLength(1, { message: 'Enter your name.' }) @MaxLength(80) name?: string;
  @IsOptional() @IsString() @MaxLength(40) user?: string;
  @IsOptional() @IsEmail({}, { message: 'Enter an email address, for example name@example.com.' }) email?: string;
  @IsOptional() @IsIn(['account', 'game', 'palette', 'movie', 'code', 'music']) av?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(80) country?: string;
  @IsOptional() @IsString() @MaxLength(80) tz?: string;
  @IsOptional() @IsString() @MaxLength(40) lang?: string;
  @IsOptional() @IsIn(['Light', 'Dark', 'System']) theme?: string;
  @IsOptional() @IsString() @MaxLength(20) accent?: string;
  @IsOptional() @IsObject() settings?: Record<string, unknown>;
}

export class PasswordDto {
  @IsString() @MinLength(1, { message: 'Enter your current password.' }) current: string;
  @IsString() @MinLength(8, { message: 'The new password needs at least 8 characters.' }) @MaxLength(200) next: string;
}
