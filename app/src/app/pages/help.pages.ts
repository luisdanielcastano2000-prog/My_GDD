// Help: menú de ayuda, guía paso a paso, glosario y enviar feedback.
import { Component, inject, signal } from '@angular/core';
import { IonContent, IonHeader } from '@ionic/angular';

import { ApiService, apiMessage } from '../data/api.service';
import { StoreService } from '../data/store.service';
import { NavService } from '../shared/nav.service';
import { SegComponent, SwitchComponent, TopBarComponent } from '../shared/ui';

import { withLoading } from './auth.pages';

@Component({
  selector: 'app-help',
  imports: [IonHeader, IonContent, TopBarComponent],
  template: `
    <ion-header class="cards"><app-top-bar title="How can we help?" /></ion-header>
    <ion-content class="page-cards">
      <div class="page with-nav" style="gap:8px">
        @for (it of items; track it.url) {
          <button class="li tall card" type="button" (click)="nav.go(it.url)">
            <span class="ms">{{ it.icon }}</span>
            <span class="li-text"><span class="li-title">{{ it.title }}</span><span class="li-sub">{{ it.sub }}</span></span>
            <span class="ms li-trail">chevron_right</span>
          </button>
        }
      </div>
    </ion-content>
  `,
})
export class HelpPage {
  protected nav = inject(NavService);
  protected items = [
    { icon: 'menu_book', title: 'Step-by-step guide', sub: 'How to write each block of your GDD.', url: '/help/guide' },
    { icon: 'description', title: 'Glossary', sub: 'Game design terms, explained.', url: '/help/glossary' },
    { icon: 'mail', title: 'Send feedback', sub: 'Tell us what to improve.', url: '/help/feedback' },
  ];
}

@Component({
  selector: 'app-guide',
  imports: [IonHeader, IonContent, TopBarComponent],
  template: `
    <ion-header class="cards"><app-top-bar title="Step-by-step guide" back="/help" /></ion-header>
    <ion-content class="page-cards">
      <div class="page with-nav">
        <p class="intro">Write your GDD in five steps.</p>
        <ol class="steps">
          @for (s of steps; track $index) {
            <li class="card"><span class="n">{{ $index + 1 }}</span><span class="li-title">{{ s }}</span></li>
          }
        </ol>
      </div>
    </ion-content>
  `,
})
export class GuidePage {
  protected steps = [
    'Choose a template: detailed or minimal.',
    'Fill in the essential blocks first.',
    'Not sure what to write? Read “What it’s for” in each block.',
    'When the game changes, send a quick note to your team.',
    'Review the blocks that are out of date and mark them as reviewed.',
  ];
}

@Component({
  selector: 'app-glossary',
  imports: [IonHeader, IonContent, TopBarComponent],
  template: `
    <ion-header class="cards"><app-top-bar title="Glossary" back="/help" /></ion-header>
    <ion-content class="page-cards">
      <div class="page with-nav">
        <dl class="gloss card">
          @for (t of terms; track t[0]) {
            <div><dt>{{ t[0] }}</dt><dd>{{ t[1] }}</dd></div>
          }
        </dl>
      </div>
    </ion-content>
  `,
})
export class GlossaryPage {
  protected terms = [
    ['GDD', 'Game Design Document. It describes how your game works.'],
    ['Block', 'One part of your GDD, such as Story or Gameplay.'],
    ['Template', 'A ready-made set of blocks to start your GDD.'],
    ['Core loop', 'The main actions the player repeats again and again.'],
    ['Out of date', 'A block that no longer matches the game.'],
  ];
}

@Component({
  selector: 'app-feedback',
  imports: [IonHeader, IonContent, TopBarComponent, SegComponent, SwitchComponent],
  template: `
    <ion-header><app-top-bar title="Send feedback" back="/help" /></ion-header>
    <ion-content>
      <form class="page with-nav" (submit)="$event.preventDefault(); send()" novalidate>
        <p class="intro">What should we improve? We read every message.</p>
        <span class="t-label-large">Topic</span>
        <app-seg label="Topic" [options]="['Idea', 'Problem', 'Question']" [(value)]="topic" />
        <div class="field" [class.error]="err()">
          <div class="field-box">
            <label for="fb-text">Message</label>
            <textarea id="fb-text" [value]="text()" (input)="text.set($any($event.target).value); err.set(false)"></textarea>
          </div>
          @if (err()) { <span class="field-error">Write your message before sending it.</span> }
        </div>
        <div class="setting" style="padding:0">
          <span class="li-text"><span class="li-title">You can reply to me</span><span class="li-sub">We’ll answer to your email.</span></span>
          <app-switch label="You can reply to me" [(on)]="reply" />
        </div>
        <button class="btn btn-filled m block" type="submit" [class.ok]="phase() === 'ok'" [attr.aria-busy]="!!phase()">
          @switch (phase()) {
            @case ('load') { <span class="spin"></span>Sending your feedback }
            @case ('ok') { <span class="ms">check</span>Feedback sent }
            @default { Send feedback }
          }
        </button>
      </form>
    </ion-content>
  `,
})
export class FeedbackPage {
  private store = inject(StoreService);
  private api = inject(ApiService);
  private nav = inject(NavService);
  protected topic = signal('Idea');
  protected text = signal('');
  protected reply = signal(true);
  protected err = signal(false);
  protected phase = signal<'' | 'load' | 'ok'>('');
  send(): void {
    if (!this.text().trim()) { this.err.set(true); return; }
    if (!this.store.live()) { // selector de pantallas: sin servidor
      withLoading(this.store, this.phase, () => { this.nav.back('/help'); this.store.toast('Thanks! We got your feedback.'); });
      return;
    }
    this.phase.set('load');
    this.api.sendFeedback(this.topic(), this.text().trim(), this.reply()).then(
      () => { this.phase.set('ok'); setTimeout(() => { this.phase.set(''); this.nav.back('/help'); this.store.toast('Thanks! We got your feedback.'); }, 650); },
      (e: unknown) => { this.phase.set(''); this.store.toast(apiMessage(e), { kind: 'err', action: { label: 'Retry', run: () => this.send() } }); },
    );
  }
}
