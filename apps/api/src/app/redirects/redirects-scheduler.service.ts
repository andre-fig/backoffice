import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedirectsService } from './redirects.service';

@Injectable()
export class RedirectsSchedulerService {
  private readonly logger = new Logger(RedirectsSchedulerService.name);

  constructor(private readonly redirectsService: RedirectsService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleScheduledRedirects() {
    this.logger.log('Processando redirecionamentos agendados...');
    try {
      await this.redirectsService.processScheduledRedirects();
      this.logger.log('Processamento de redirecionamentos concluído.');
    } catch (error) {
      this.logger.error(
        'Erro ao processar redirecionamentos agendados:',
        error
      );
    }
  }
}
