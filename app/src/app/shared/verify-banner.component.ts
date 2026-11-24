// Aviso «verifica tu email» (solo si hay servicio de correo y aún no está verificado).
import { Component, inject } from '@angular/core';

import { StoreService } from '../data/store.service';

@Component({
  selector: 'app-verify-banner',
  template: `
    @if (store.verifyRequired()) {
      <div class="banner-warn verify-banner" role="status">
        <span class="ms s20" aria-hidden="true">mark_email_unread</span>
        <span class="li-text">
          <span class="li-title">Verify your email</span>
          <span class="li-sub">To invite people and join teams, open the link we sent to {{ store.data().user.email }}.</span>
        </span>
        <button class="btn btn-text" type="button" (click)="store.resendVerify()">Send link</button>
      </div>
    }
  `,
})
export class VerifyBannerComponent {
  protected store = inject(StoreService);
}
