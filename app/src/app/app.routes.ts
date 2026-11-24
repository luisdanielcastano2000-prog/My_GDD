import type { Routes } from '@angular/router';

import { authGuard, devGuard, guestGuard } from './shared/auth.guard';

// Cada pantalla se carga cuando se necesita (loadComponent). Los :parámetros llegan a la página como inputs.
const auth = () => import('./pages/auth.pages');
const home = () => import('./pages/home.pages');
const depts = () => import('./pages/depts.pages');
const review = () => import('./pages/review.pages');
const notes = () => import('./pages/notes.pages');
const help = () => import('./pages/help.pages');
const profile = () => import('./pages/profile.pages');

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  // Acceso
  { path: 'login', canActivate: [guestGuard], loadComponent: () => auth().then((m) => m.LoginPage) },
  { path: 'signup', canActivate: [guestGuard], loadComponent: () => auth().then((m) => m.SignupPage) },
  { path: 'forgot', canActivate: [guestGuard], loadComponent: () => auth().then((m) => m.ForgotPage) },
  { path: 'forgot/sent', canActivate: [guestGuard], loadComponent: () => auth().then((m) => m.ForgotSentPage) },
  // Enlaces de los correos (con o sin sesión abierta)
  { path: 'verify', loadComponent: () => auth().then((m) => m.VerifyPage) },
  { path: 'reset', loadComponent: () => auth().then((m) => m.ResetPage) },
  // GDDs
  { path: 'home', canActivate: [authGuard], loadComponent: () => home().then((m) => m.HomePage) },
  { path: 'new-gdd', canActivate: [authGuard], loadComponent: () => home().then((m) => m.NewGddPage) },
  { path: 'gdd/:gid', canActivate: [authGuard], loadComponent: () => depts().then((m) => m.DeptsPage) },
  { path: 'gdd/:gid/outdated', canActivate: [authGuard], loadComponent: () => review().then((m) => m.OutdatedPage) },
  { path: 'gdd/:gid/review/:nid', canActivate: [authGuard], loadComponent: () => review().then((m) => m.ReviewPage) },
  { path: 'gdd/:gid/dept/:dpid', canActivate: [authGuard], loadComponent: () => depts().then((m) => m.DeptPage) },
  { path: 'gdd/:gid/dept/:dpid/block/:bid', canActivate: [authGuard], loadComponent: () => import('./pages/editor.page').then((m) => m.EditorPage) },
  // Notas
  { path: 'notes', canActivate: [authGuard], loadComponent: () => notes().then((m) => m.NotesPage) },
  { path: 'notes/new', canActivate: [authGuard], loadComponent: () => notes().then((m) => m.NewNotePage) },
  // Ayuda
  { path: 'help', canActivate: [authGuard], loadComponent: () => help().then((m) => m.HelpPage) },
  { path: 'help/guide', canActivate: [authGuard], loadComponent: () => help().then((m) => m.GuidePage) },
  { path: 'help/glossary', canActivate: [authGuard], loadComponent: () => help().then((m) => m.GlossaryPage) },
  { path: 'help/feedback', canActivate: [authGuard], loadComponent: () => help().then((m) => m.FeedbackPage) },
  // Perfil
  { path: 'profile', canActivate: [authGuard], loadComponent: () => profile().then((m) => m.ProfilePage) },
  { path: 'profile/edit', canActivate: [authGuard], loadComponent: () => profile().then((m) => m.EditProfilePage) },
  { path: 'profile/personal', canActivate: [authGuard], loadComponent: () => profile().then((m) => m.PersonalPage) },
  { path: 'profile/password', canActivate: [authGuard], loadComponent: () => profile().then((m) => m.PasswordPage) },
  { path: 'profile/team', canActivate: [authGuard], loadComponent: () => profile().then((m) => m.TeamPage) },
  { path: 'profile/language', canActivate: [authGuard], loadComponent: () => profile().then((m) => m.LanguagePage) },
  { path: 'profile/privacy', canActivate: [authGuard], loadComponent: () => profile().then((m) => m.PrivacyPage) },
  // Selector de pantallas del diseño (desarrollo)
  { path: 'scenes', canActivate: [devGuard], loadComponent: () => import('./pages/scenes.page').then((m) => m.ScenesPage) },
  { path: '**', redirectTo: 'home' },
];
