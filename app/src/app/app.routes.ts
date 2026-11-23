import type { Routes } from '@angular/router';

// Cada pantalla se carga cuando se necesita (loadComponent). Los :parámetros llegan a la página como inputs.
const auth = () => import('./pages/auth.pages');
const home = () => import('./pages/home.pages');
const depts = () => import('./pages/depts.pages');
const review = () => import('./pages/review.pages');
const notes = () => import('./pages/notes.pages');
const help = () => import('./pages/help.pages');
const profile = () => import('./pages/profile.pages');

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  // Acceso
  { path: 'login', loadComponent: () => auth().then((m) => m.LoginPage) },
  { path: 'signup', loadComponent: () => auth().then((m) => m.SignupPage) },
  { path: 'forgot', loadComponent: () => auth().then((m) => m.ForgotPage) },
  { path: 'forgot/sent', loadComponent: () => auth().then((m) => m.ForgotSentPage) },
  // GDDs
  { path: 'home', loadComponent: () => home().then((m) => m.HomePage) },
  { path: 'new-gdd', loadComponent: () => home().then((m) => m.NewGddPage) },
  { path: 'gdd/:gid', loadComponent: () => depts().then((m) => m.DeptsPage) },
  { path: 'gdd/:gid/outdated', loadComponent: () => review().then((m) => m.OutdatedPage) },
  { path: 'gdd/:gid/review/:nid', loadComponent: () => review().then((m) => m.ReviewPage) },
  { path: 'gdd/:gid/dept/:dpid', loadComponent: () => depts().then((m) => m.DeptPage) },
  { path: 'gdd/:gid/dept/:dpid/block/:bid', loadComponent: () => import('./pages/editor.page').then((m) => m.EditorPage) },
  // Notas
  { path: 'notes', loadComponent: () => notes().then((m) => m.NotesPage) },
  { path: 'notes/new', loadComponent: () => notes().then((m) => m.NewNotePage) },
  // Ayuda
  { path: 'help', loadComponent: () => help().then((m) => m.HelpPage) },
  { path: 'help/guide', loadComponent: () => help().then((m) => m.GuidePage) },
  { path: 'help/glossary', loadComponent: () => help().then((m) => m.GlossaryPage) },
  { path: 'help/feedback', loadComponent: () => help().then((m) => m.FeedbackPage) },
  // Perfil
  { path: 'profile', loadComponent: () => profile().then((m) => m.ProfilePage) },
  { path: 'profile/edit', loadComponent: () => profile().then((m) => m.EditProfilePage) },
  { path: 'profile/personal', loadComponent: () => profile().then((m) => m.PersonalPage) },
  { path: 'profile/password', loadComponent: () => profile().then((m) => m.PasswordPage) },
  { path: 'profile/team', loadComponent: () => profile().then((m) => m.TeamPage) },
  { path: 'profile/language', loadComponent: () => profile().then((m) => m.LanguagePage) },
  { path: 'profile/privacy', loadComponent: () => profile().then((m) => m.PrivacyPage) },
  // Selector de pantallas del diseño (desarrollo)
  { path: 'scenes', loadComponent: () => import('./pages/scenes.page').then((m) => m.ScenesPage) },
  { path: '**', redirectTo: 'home' },
];
