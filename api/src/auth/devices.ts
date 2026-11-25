// Aparatos de confianza (verificación en dos pasos): el front crea un identificador por navegador y lo guarda
// en localStorage; el servidor guarda solo su sha256. Ahí no se vuelve a pedir el código.
import { sha256 } from '../mail/mail.service.js';

/** ¿Este navegador es de confianza? */
export const trusted = (devices: string[] | undefined, device: string | undefined): boolean => !!device && (devices ?? []).includes(sha256(device));

/** Añade este navegador a la lista (los 10 últimos; el más reciente al final). */
export const trust = (devices: string[] | undefined, device: string | undefined): string[] => {
  if (!device) return devices ?? [];
  const h = sha256(device);
  return [...(devices ?? []).filter((d) => d !== h), h].slice(-10);
};
