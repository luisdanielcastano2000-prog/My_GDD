// Solo en el Mac y en las pruebas (modo «outbox», sin servicio de correo): ver los correos «enviados».
import { Controller, Get, NotFoundException, Query } from '@nestjs/common';

import { MailService } from './mail/mail.service.js';

@Controller('dev')
export class DevController {
  constructor(private readonly mail: MailService) {}

  /** GET /api/dev/outbox?to=email → últimos correos a esa dirección (con su enlace). En producción: 404. */
  @Get('outbox')
  async outbox(@Query('to') to: string): Promise<unknown> {
    if (this.mail.mode !== 'outbox') throw new NotFoundException();
    return this.mail.lastTo(String(to ?? ''));
  }
}
