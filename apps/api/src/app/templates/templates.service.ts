import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TemplateEntity } from '../../database/db-backoffice/entities/template.entity';
import { TemplateAnalyticsEntity } from '../../database/db-backoffice/entities/template-analytics.entity';
import { Datasources } from '../../common/datasources.enum';
import { WabasService } from '../wabas/wabas.service';
import { MetaService } from '../meta/meta.service';
import {
  MetaTemplate,
  TemplateAnalyticsDataPoint,
  TemplateAnalyticsCostEntry,
} from '@backoffice-monorepo/shared-types';
import { parseISO, startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);
  private readonly analyticsChunkSize = 20;
  private templatesSyncInProgress = false;
  private analyticsSyncInProgress = false;

  constructor(
    @InjectRepository(TemplateEntity, Datasources.DB_BACKOFFICE)
    private readonly templateRepository: Repository<TemplateEntity>,
    @InjectRepository(TemplateAnalyticsEntity, Datasources.DB_BACKOFFICE)
    private readonly templateAnalyticsRepository: Repository<TemplateAnalyticsEntity>,
    private readonly wabasService: WabasService,
    private readonly metaService: MetaService
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async syncTemplatesCron(): Promise<void> {
    if (this.templatesSyncInProgress) {
      this.logger.warn('Template sync already running, skipping this cycle');
      return;
    }

    this.templatesSyncInProgress = true;

    try {
      const wabaIds = await this.wabasService.getAllWabaIds();
      for (const wabaExternalId of wabaIds) {
        await this.syncTemplatesForWaba(wabaExternalId);
      }
    } catch (error) {
      this.logger.error('Failed to synchronize templates', error);
    } finally {
      this.templatesSyncInProgress = false;
    }
  }

  private async syncTemplatesForWaba(
    wabaExternalId: string
  ): Promise<void> {
    const waba = await this.wabasService.findOne(wabaExternalId);

    if (!waba) {
      this.logger.warn(
        `Skipping template sync because WABA ${wabaExternalId} was not found`
      );
      return;
    }

    try {
      const metaTemplates = await this.metaService.listTemplates(
        wabaExternalId
      );
      if (!metaTemplates.length) {
        this.logger.log(
          `No templates returned by Meta for WABA ${wabaExternalId}`
        );
        return;
      }

      const payload = metaTemplates
        .map((template) =>
          this.mapMetaTemplateToEntityPayload(template, waba.id)
        )
        .filter((template): template is Partial<TemplateEntity> => !!template);

      if (!payload.length) {
        this.logger.warn(
          `All templates returned for WABA ${wabaExternalId} were invalid`
        );
        return;
      }

      await this.templateRepository.upsert(payload, ['wabaId', 'externalId']);
      this.logger.log(
        `Synchronized ${payload.length} templates for WABA ${wabaExternalId}`
      );
    } catch (error) {
      this.logger.error(
        `Error synchronizing templates for WABA ${wabaExternalId}`,
        error
      );
    }
  }

  private mapMetaTemplateToEntityPayload(
    template: MetaTemplate,
    wabaUuid: string
  ): Partial<TemplateEntity> | null {
    const externalId = template.id ?? template.name;
    if (!externalId || !template.name || !template.language) {
      return null;
    }

    return {
      wabaId: wabaUuid,
      externalId,
      name: template.name,
      language: template.language,
      status: template.status ?? null,
      category: template.category ?? null,
      updatedAt: new Date(),
    };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async syncTemplateAnalyticsCron(): Promise<void> {
    if (this.analyticsSyncInProgress) {
      this.logger.warn(
        'Template analytics sync already running, skipping this cycle'
      );
      return;
    }

    this.analyticsSyncInProgress = true;

    try {
      const wabaIds = await this.wabasService.getAllWabaIds();
      const { startDate, endDate } = this.buildDateRange();

      for (const wabaExternalId of wabaIds) {
        await this.syncTemplateAnalyticsForWaba(
          wabaExternalId,
          startDate,
          endDate
        );
      }
    } catch (error) {
      this.logger.error('Failed to synchronize template analytics', error);
    } finally {
      this.analyticsSyncInProgress = false;
    }
  }

  private async syncTemplateAnalyticsForWaba(
    wabaExternalId: string,
    startDate: Date,
    endDate: Date
  ): Promise<void> {
    const waba = await this.wabasService.findOne(wabaExternalId);

    if (!waba) {
      this.logger.warn(
        `Skipping template analytics sync because WABA ${wabaExternalId} was not found`
      );
      return;
    }

    const templates = await this.templateRepository.find({
      select: ['id', 'externalId'],
      where: { wabaId: waba.id },
    });

    if (!templates.length) {
      this.logger.log(
        `No templates stored locally for WABA ${wabaExternalId}, skipping analytics`
      );
      return;
    }

    const templateByExternalId = new Map(
      templates.map((template) => [template.externalId, template])
    );

    const templateIdBatches = this.chunkArray(
      templates.map((template) => template.externalId),
      this.analyticsChunkSize
    );

    for (const batch of templateIdBatches) {
      try {
        const analyticsResponse =
          await this.metaService.getTemplateAnalytics(
            wabaExternalId,
            batch,
            startDate,
            endDate
          );

        const datasets = analyticsResponse?.data ?? [];

        for (const dataset of datasets) {
          const dataPoints = dataset?.data_points ?? [];

          const payload = dataPoints
            .map((dataPoint) =>
              this.mapAnalyticsDataPoint(
                dataPoint,
                templateByExternalId,
                dataset?.granularity ?? 'DAILY'
              )
            )
            .filter(
              (dataPoint): dataPoint is Partial<TemplateAnalyticsEntity> =>
                !!dataPoint
            );

          if (!payload.length) {
            continue;
          }

          await this.templateAnalyticsRepository.upsert(payload, [
            'templateId',
            'date',
          ]);
        }
      } catch (error) {
        this.logger.error(
          `Failed to fetch analytics for WABA ${wabaExternalId} batch`,
          error
        );
      }
    }
  }

  private mapAnalyticsDataPoint(
    dataPoint: TemplateAnalyticsDataPoint,
    templateLookup: Map<
      string,
      Pick<TemplateEntity, 'id' | 'externalId'>
    >,
    granularity: string
  ): Partial<TemplateAnalyticsEntity> | null {
    const template = templateLookup.get(dataPoint.template_id);

    if (!template) {
      return null;
    }

    const date = this.normalizeDateFromTimestamp(dataPoint.start);
    const { amountSpent, costPerDelivered } = this.extractCosts(
      dataPoint.cost
    );

    return {
      templateId: template.id,
      date,
      granularity,
      sent: dataPoint.sent ?? 0,
      delivered: dataPoint.delivered ?? 0,
      read: dataPoint.read ?? 0,
      costAmount: amountSpent,
      costPerDelivered,
      updatedAt: new Date(),
    };
  }

  private extractCosts(
    costEntries?: TemplateAnalyticsCostEntry[]
  ): { amountSpent: number; costPerDelivered: number } {
    let amountSpent = 0;
    let costPerDelivered = 0;

    if (Array.isArray(costEntries)) {
      for (const entry of costEntries) {
        if (entry.type === 'amount_spent') {
          amountSpent = entry.value ?? 0;
        }
        if (entry.type === 'cost_per_delivered') {
          costPerDelivered = entry.value ?? 0;
        }
      }
    }

    return { amountSpent, costPerDelivered };
  }

  private normalizeDateFromTimestamp(timestamp: number): Date {
    const date = new Date(timestamp * 1000);
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    );
  }

  private chunkArray<T>(input: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < input.length; i += chunkSize) {
      chunks.push(input.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private buildDateRange(): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    endDate.setUTCHours(23, 59, 59, 999);

    const startDate = new Date(endDate);
    startDate.setUTCDate(startDate.getUTCDate() - 6);
    startDate.setUTCHours(0, 0, 0, 0);

    return { startDate, endDate };
  }

  async listTemplates(wabaExternalId?: string): Promise<TemplateEntity[]> {
    let whereClause: FindOptionsWhere<TemplateEntity> | undefined;

    if (wabaExternalId) {
      const waba = await this.wabasService.findOne(wabaExternalId);
      if (!waba) {
        return [];
      }
      whereClause = { wabaId: waba.id };
    }

    return this.templateRepository.find({
      where: whereClause,
      relations: ['waba'],
      order: { updatedAt: 'DESC', name: 'ASC' },
    });
  }

  async getTemplateAnalytics(
    templateId: string,
    start?: string,
    end?: string
  ): Promise<TemplateAnalyticsEntity[]> {
    const whereClause: FindOptionsWhere<TemplateAnalyticsEntity> = {
      templateId,
    };

    if (start && end) {
      const startDate = startOfDay(parseISO(start));
      const endDate = endOfDay(parseISO(end));
      whereClause.date = Between(startDate, endDate);
    }

    return this.templateAnalyticsRepository.find({
      where: whereClause,
      order: { date: 'DESC' },
    });
  }
}
