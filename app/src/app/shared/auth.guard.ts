import { inject, isDevMode } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { ApiService } from '../data/api.service';
import { StoreService } from '../data/store.service';

/** Pantallas de la app: hace falta sesión. Al recargar la página, vuelve a cargar los datos de la cuenta. */
export const authGuard: CanActivateFn = async () => {
  const store = inject(StoreService);
  const router = inject(Router);
  if (!inject(ApiService).token) return router.parseUrl('/login');
  if (store.live() || store.loadErr()) return true;
  return (await store.load()) ? true : router.parseUrl('/login');
};

/** Log in / Sign up: si ya hay sesión, directo a Home. */
export const guestGuard: CanActivateFn = () => (inject(ApiService).token ? inject(Router).parseUrl('/home') : true);

/** El selector de pantallas (datos de ejemplo) solo existe en desarrollo. */
export const devGuard: CanActivateFn = () => isDevMode() || inject(Router).parseUrl('/home');
