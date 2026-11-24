import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';

import { OverlaysComponent } from './shared/overlays.component';
import { SplashComponent } from './shared/splash.component';
import { NavBarComponent } from './shared/ui';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, NavBarComponent, OverlaysComponent, SplashComponent],
})
export class AppComponent {}
