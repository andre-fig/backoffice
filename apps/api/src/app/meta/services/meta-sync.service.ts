import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MetaService } from '../meta.service';
import { ImWabaEntity } from '../../../database/db-backoffice/entities/im-waba.entity';
import { MetaLineEntity } from '../../../database/db-backoffice/entities/meta-line.entity';
import { Datasources } from '../../../common/datasources.enum';

@Injectable()
export class MetaSyncService {
  private readonly logger = new Logger(MetaSyncService.name);
  private isSyncing = false;

  constructor(
    private readonly metaService: MetaService,
    @InjectRepository(ImWabaEntity, Datasources.DB_BACKOFFICE)
    private readonly wabaRepository: Repository<ImWabaEntity>,
    @InjectRepository(MetaLineEntity, Datasources.DB_BACKOFFICE)
    private readonly lineRepository: Repository<MetaLineEntity>
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async scheduledSync() {
    this.logger.log('Iniciando sincronização agendada com Meta API');
    await this.syncMetaData();
  }

  async syncMetaData(): Promise<void> {
    if (this.isSyncing) {
      this.logger.warn('Sincronização já em andamento, pulando execução');
      return;
    }

    this.isSyncing = true;

    try {
      this.logger.log('Iniciando sincronização de dados da Meta');

      const metaWabas = await this.metaService.listWabas();
      this.logger.log(`Encontrados ${metaWabas.length} WABAs na Meta API`);

      for (const metaWaba of metaWabas) {
        await this.syncWaba(metaWaba.id, metaWaba.name || '');
      }

      for (const metaWaba of metaWabas) {
        await this.syncLinesForWaba(metaWaba.id);
      }

      this.logger.log('Sincronização concluída com sucesso');
    } catch (error) {
      this.logger.error('Erro durante sincronização', error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncWaba(wabaId: string, wabaName: string): Promise<void> {
    try {
      let waba = await this.wabaRepository.findOne({
        where: { wabaId },
      });

      if (waba) {
        waba.wabaName = wabaName;
        await this.wabaRepository.save(waba);
        this.logger.debug(`WABA ${wabaId} atualizado`);
      } else {
        waba = this.wabaRepository.create({
          wabaId,
          wabaName,
          isVisible: false,
        });
        await this.wabaRepository.save(waba);
        this.logger.log(`WABA ${wabaId} criado`);
      }
    } catch (error) {
      this.logger.error(`Erro ao sincronizar WABA ${wabaId}`, error);
      throw error;
    }
  }

  private async syncLinesForWaba(wabaId: string): Promise<void> {
    try {
      const metaLines = await this.metaService.listLines(wabaId);
      this.logger.debug(
        `Encontradas ${metaLines.length} linhas para WABA ${wabaId}`
      );

      const existingLines = await this.lineRepository.find({
        where: { wabaId },
        select: ['lineId'],
      });
      const existingLineIds = new Set(existingLines.map((l) => l.lineId));

      for (const metaLine of metaLines) {
        await this.syncLine(
          wabaId,
          metaLine.id,
          existingLineIds.has(metaLine.id)
        );
      }

      const metaLineIds = new Set(metaLines.map((l) => l.id));
      const linesToRemove = existingLines.filter(
        (l) => !metaLineIds.has(l.lineId)
      );

      if (linesToRemove.length > 0) {
        await this.lineRepository.remove(linesToRemove);
        this.logger.log(
          `Removidas ${linesToRemove.length} linhas obsoletas do WABA ${wabaId}`
        );
      }
    } catch (error) {
      this.logger.error(`Erro ao sincronizar linhas do WABA ${wabaId}`, error);
      throw error;
    }
  }

  private async syncLine(
    wabaId: string,
    lineId: string,
    exists: boolean
  ): Promise<void> {
    try {
      const details = await this.metaService.getPhoneNumberDetails(lineId);

      const lineData = {
        lineId,
        wabaId,
        displayPhoneNumber: details.display_phone_number || '',
        verifiedName: details.verified_name || '',
        nameStatus: details.name_status || '',
        status: '', // Will be updated if available from listLines
        qualityRating: details.quality_rating || '',
        isOfficialBusinessAccount:
          details.is_official_business_account || false,
      };

      if (exists) {
        await this.lineRepository.update({ lineId }, lineData);
        this.logger.debug(`Linha ${lineId} atualizada`);
      } else {
        const line = this.lineRepository.create(lineData);
        await this.lineRepository.save(line);
        this.logger.debug(`Linha ${lineId} criada`);
      }
    } catch (error) {
      this.logger.error(`Erro ao sincronizar linha ${lineId}`, error);
    }
  }

  async getVisibleWabas(): Promise<ImWabaEntity[]> {
    return this.wabaRepository.find({
      where: { isVisible: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getAllWabas(): Promise<ImWabaEntity[]> {
    return this.wabaRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getLinesForWaba(wabaId: string): Promise<MetaLineEntity[]> {
    return this.lineRepository.find({
      where: { wabaId },
      order: { createdAt: 'DESC' },
    });
  }

  async getAllVisibleLines(): Promise<MetaLineEntity[]> {
    const visibleWabas = await this.getVisibleWabas();
    const visibleWabaIds = visibleWabas.map((w) => w.wabaId);

    if (visibleWabaIds.length === 0) {
      return [];
    }

    return this.lineRepository
      .createQueryBuilder('line')
      .where('line.wabaId IN (:...wabaIds)', { wabaIds: visibleWabaIds })
      .orderBy('line.createdAt', 'DESC')
      .getMany();
  }
}
