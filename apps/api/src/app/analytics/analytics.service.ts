import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnalyticsEntity } from '../../database/db-backoffice/entities/analytics.entity';
import { LineEntity } from '../../database/db-backoffice/entities/line.entity';
import { WabasService } from '../wabas/wabas.service';
import { Datasources } from '../../common/datasources.enum';
import {
  PricingDataPoint,
  WabaAnalyticsResponseDto,
} from '@backoffice-monorepo/shared-types';
import { MetaService } from '../meta/meta.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(AnalyticsEntity, Datasources.DB_BACKOFFICE)
    private readonly analyticsRepository: Repository<AnalyticsEntity>,
    @InjectRepository(LineEntity, Datasources.DB_BACKOFFICE)
    private readonly lineRepository: Repository<LineEntity>,
    private readonly imWabasService: WabasService,
    private readonly metaService: MetaService
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async collectAnalytics() {
    this.logger.log('Starting analytics collection cron job');

    try {
      const wabaIds = await this.imWabasService.getAllWabaIds();
      this.logger.log(`Found ${wabaIds.length} WABAs to process`);

      for (const wabaId of wabaIds) {
        await this.collectAnalyticsForWaba(wabaId);
      }

      this.logger.log('Analytics collection completed successfully');
    } catch (error) {
      this.logger.error('Error during analytics collection', error);
    }
  }

  private normalizePhoneNumber(phoneNumber: string): string {
    const normalized = phoneNumber.replace(/[^\d]/g, '');
    return `+${normalized}`;
  }

  async collectAnalyticsForWaba(wabaId: string): Promise<void> {
    this.logger.log(
      `Starting analytics collection for WABA ${wabaId} (last 7 days).`
    );

    try {
      const now = new Date();
      const yearUTC = now.getUTCFullYear();
      const monthUTC = now.getUTCMonth();
      const dayUTC = now.getUTCDate();

      const promises = [];

      for (let i = 0; i < 7; i++) {
        const dayStart = new Date(
          Date.UTC(yearUTC, monthUTC, dayUTC - i, 0, 0, 0, 0)
        );
        const dayEnd = new Date(
          Date.UTC(yearUTC, monthUTC, dayUTC - i, 23, 59, 59, 999)
        );

        promises.push(
          this.fetchAndSaveAnalyticsForRange(wabaId, dayStart, dayEnd)
        );
      }

      await Promise.allSettled(promises);

      this.logger.log(
        `Completed analytics collection cycle for WABA ${wabaId}.`
      );
    } catch (error) {
      this.logger.error(
        `Critical error during analytics collection setup for WABA ${wabaId}`,
        error
      );
    }
  }

  private async fetchAndSaveAnalyticsForRange(
    wabaId: string,
    startDate: Date,
    endDate: Date
  ): Promise<void> {
    this.logger.log(
      `Fetching analytics for WABA ${wabaId} from ${startDate.toISOString()} to ${endDate.toISOString()}`
    );

    try {
      const conversationAnalytics = await this.metaService.getAnalytics(
        wabaId,
        startDate,
        endDate
      );

      const dataPoints =
        conversationAnalytics?.pricing_analytics?.data?.[0]?.data_points ?? [];

      if (dataPoints.length === 0) {
        this.logger.log(
          `No data points found for WABA ${wabaId} in this range.`
        );
        return;
      }

      this.logger.log(
        `Found ${dataPoints.length} data points. Saving valid ones...`
      );

      const savePromises = dataPoints
        .filter((dataPoint) => dataPoint?.phone_number)
        .map((dataPoint) => this.saveDataPoint(dataPoint));

      await Promise.all(savePromises);

      this.logger.log(
        `Successfully saved data points for range: ${startDate.toISOString()}`
      );
    } catch (error) {
      this.logger.error(
        `Error processing range ${startDate.toISOString()} for WABA ${wabaId}`,
        error
      );
      throw error;
    }
  }

  private async saveDataPoint(dataPoint: PricingDataPoint): Promise<void> {
    try {
      const dateTimestamp = new Date(dataPoint.start * 1000);

      const yearUTC = dateTimestamp.getUTCFullYear();
      const monthUTC = dateTimestamp.getUTCMonth();
      const dayUTC = dateTimestamp.getUTCDate();

      const date = new Date(yearUTC, monthUTC, dayUTC);

      const normalizedPhoneNumber = this.normalizePhoneNumber(
        dataPoint.phone_number
      );

      const line = await this.lineRepository.findOne({
        where: { normalizedPhoneNumber },
      });

      if (!line) {
        this.logger.warn(
          `Line not found for phone number ${dataPoint.phone_number} (normalized: ${normalizedPhoneNumber}), skipping data point`
        );
        return;
      }

      const existing = await this.analyticsRepository.findOne({
        where: {
          lineId: line.id,
          date: date,
          pricingCategory: dataPoint.pricing_category,
          pricingType: dataPoint.pricing_type,
        },
      });

      if (existing) {
        existing.volume = dataPoint.volume;
        existing.cost = dataPoint.cost ?? 0;
        await this.analyticsRepository.save(existing);
        this.logger.debug(
          `Updated analytics for line ${line.id} on ${date.toISOString()}`
        );
      } else {
        const analytics = this.analyticsRepository.create({
          lineId: line.id,
          date: date,
          pricingCategory: dataPoint.pricing_category,
          pricingType: dataPoint.pricing_type,
          volume: dataPoint.volume,
          cost: dataPoint.cost ?? 0,
        });

        await this.analyticsRepository.save(analytics);
        this.logger.debug(
          `Created analytics for line ${line.id} on ${date.toISOString()}`
        );
      }
    } catch (error) {
      this.logger.error('Error saving data point', error);
    }
  }

  async getWabaAnalytics(
    wabaId: string,
    startDate?: string,
    endDate?: string
  ): Promise<WabaAnalyticsResponseDto> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const start = startDate ? new Date(startDate + 'T00:00:00.000Z') : today;
    const end = endDate ? new Date(endDate + 'T23:59:59.999Z') : today;

    const analytics = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .leftJoinAndSelect('analytics.line', 'line')
      .leftJoinAndSelect('line.waba', 'waba')
      .where('waba.externalId = :wabaId', { wabaId })
      .andWhere('analytics.date BETWEEN :start AND :end', { start, end })
      .getMany();

    return this.transformAnalyticsData(analytics);
  }

  async getLineAnalytics(
    lineId: string,
    startDate?: string,
    endDate?: string
  ): Promise<WabaAnalyticsResponseDto> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const start = startDate ? new Date(startDate + 'T00:00:00.000Z') : today;
    const end = endDate ? new Date(endDate + 'T23:59:59.999Z') : today;

    const analytics = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .leftJoinAndSelect('analytics.line', 'line')
      .where('analytics.lineId = :lineId', { lineId })
      .andWhere('analytics.date BETWEEN :start AND :end', { start, end })
      .getMany();

    return this.transformAnalyticsData(analytics);
  }

  private transformAnalyticsData(
    analytics: AnalyticsEntity[]
  ): WabaAnalyticsResponseDto {
    const result: WabaAnalyticsResponseDto = {};

    for (const item of analytics) {
      const dateStr = item.date as unknown as string;
      const phoneNumber = item.line.displayPhoneNumber;
      const pricingCategory = item.pricingCategory;
      const pricingType = item.pricingType;

      if (!result[dateStr]) {
        result[dateStr] = {};
      }

      if (!result[dateStr][phoneNumber]) {
        result[dateStr][phoneNumber] = {};
      }

      if (!result[dateStr][phoneNumber][pricingCategory]) {
        result[dateStr][phoneNumber][pricingCategory] = {};
      }

      result[dateStr][phoneNumber][pricingCategory][pricingType] = {
        volume: item.volume,
        cost: Number(item.cost),
      };
    }

    return result;
  }
}
