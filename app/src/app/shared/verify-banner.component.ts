// Aviso «verifica tu email» (solo si hay servicio de correo y aún no está verificado).
import { Component, inject } from '@angular/core';

import { StoreService } from '../data/store.service';
import { TPipe } from '../i18n/i18n';

@Component({
  selector: 'app-verify-banner',
  imports: [TPipe],
  template: `
    @if (store.verifyRequired()) {
      <div class="banner-warn verify-banner" role="status">
        <span class="ms s20" aria-hidden="true">mark_email_unread</span>
        <span class="li-text">
          <span class="li-title">{{ 'Verify your email' | t }}</span>
          <span class="li-sub">{{
            'To invite people and join teams, open the link we sent to {p0}.' | t: { p0: store.data().user.email }
          }}</span>
        </span>
        <button class="btn btn-text" type="button" (click)="store.resendVerify()">{{ 'Send link' | t }}</button>
      </div>
    }
  `,
})
export class VerifyBannerComponent {
  protected store = inject(StoreService);
}
