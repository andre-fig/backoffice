import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MetaService } from '../meta.service';
import { WabaEntity } from '../../../database/db-backoffice/entities/waba.entity';
import { LineEntity } from '../../../database/db-backoffice/entities/line.entity';
import { Datasources } from '../../../common/datasources.enum';

@Injectable()
export class MetaSyncService {
  private readonly logger = new Logger(MetaSyncService.name);
  private isSyncing = false;

  constructor(
    private readonly metaService: MetaService,
    @InjectRepository(WabaEntity, Datasources.DB_BACKOFFICE)
    private readonly wabaRepository: Repository<WabaEntity>,
    @InjectRepository(LineEntity, Datasources.DB_BACKOFFICE)
    private readonly lineRepository: Repository<LineEntity>
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
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
        where: { externalId: wabaId },
      });

      if (waba) {
        waba.wabaName = wabaName;
        await this.wabaRepository.save(waba);
        this.logger.debug(`WABA ${wabaId} atualizado`);
      } else {
        waba = this.wabaRepository.create({
          externalId: wabaId,
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

      const waba = await this.wabaRepository.findOne({
        where: { externalId: wabaId },
      });

      if (!waba) {
        this.logger.error(`WABA ${wabaId} não encontrado no banco de dados`);
        return;
      }

      const existingLines = await this.lineRepository.find({
        where: { waba: { id: waba.id } },
        select: ['externalId'],
      });

      const existingLineIds = new Set(existingLines.map((l) => l.externalId));

      for (const metaLine of metaLines) {
        await this.syncLine(
          waba.id,
          metaLine.id,
          metaLine.status || '',
          existingLineIds.has(metaLine.id)
        );
      }

      const metaLineIds = new Set(metaLines.map((l) => l.id));
      const linesToRemove = existingLines.filter(
        (l) => !metaLineIds.has(l.externalId)
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
    wabaUuid: string,
    lineId: string,
    lineStatus: string,
    exists: boolean
  ): Promise<void> {
    try {
      const details = await this.metaService.getPhoneNumberDetails(lineId);
      const displayPhoneNumber = details.display_phone_number || '';
      const normalizedPhoneNumber = displayPhoneNumber.replace(/[^\d+]/g, '');

      const lineData = {
        externalId: lineId,
        waba: { id: wabaUuid } as WabaEntity,
        displayPhoneNumber,
        normalizedPhoneNumber,
        verifiedName: details.verified_name || '',
        status: lineStatus,
        nameStatus: details.name_status || '',
        qualityRating: details.quality_rating || '',
        isOfficialBusinessAccount:
          details.is_official_business_account || false,
      };

      if (exists) {
        await this.lineRepository.update({ externalId: lineId }, lineData);
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

  async getAllWabas(): Promise<WabaEntity[]> {
    return this.wabaRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getLinesForWaba(wabaId: string): Promise<LineEntity[]> {
    return this.lineRepository.find({
      where: { waba: { externalId: wabaId } },
      order: { createdAt: 'DESC' },
    });
  }
}
