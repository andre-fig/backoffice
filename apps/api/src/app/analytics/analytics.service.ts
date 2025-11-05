import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { ConversationAnalyticsEntity } from '../../database/db-backoffice/entities/conversation-analytics.entity';
import { MetaLineEntity } from '../../database/db-backoffice/entities/meta-line.entity';
import { ImWabasService } from '../im-wabas/im-wabas.service';
import { Datasources } from '../../common/datasources.enum';
import { WabaAnalyticsResponseDto } from '@backoffice-monorepo/shared-types';

interface ConversationAnalyticsDataPoint {
  start: number;
  end: number;
  conversation: number;
  phone_number: string;
  conversation_category: string;
  conversation_direction: string;
  cost: number;
}

interface ConversationAnalyticsResponse {
  data: Array<{
    data_points: ConversationAnalyticsDataPoint[];
  }>;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly baseURL: string;
  private readonly accessToken: string;

  constructor(
    @InjectRepository(ConversationAnalyticsEntity, Datasources.DB_BACKOFFICE)
    private readonly analyticsRepository: Repository<ConversationAnalyticsEntity>,
    @InjectRepository(MetaLineEntity, Datasources.DB_BACKOFFICE)
    private readonly metaLineRepository: Repository<MetaLineEntity>,
    private readonly imWabasService: ImWabasService,
    private readonly http: HttpService,
    private readonly config: ConfigService
  ) {
    const version = this.config.get<string>('META_GRAPH_VERSION') ?? 'v20.0';
    this.baseURL = `https://graph.facebook.com/${version}`;
    this.accessToken = this.config.get<string>('META_ACCESS_TOKEN') ?? '';
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
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
    return phoneNumber.replace(/[^\d+]/g, '');
  }

  async collectAnalyticsForWaba(wabaId: string): Promise<void> {
    try {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);

      const yesterdayStart = new Date(Date.UTC(
        yesterday.getUTCFullYear(),
        yesterday.getUTCMonth(),
        yesterday.getUTCDate(),
        0, 0, 0, 0
      ));
      const todayEnd = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23, 59, 59, 999
      ));

      const startTimestamp = Math.floor(yesterdayStart.getTime() / 1000);
      const endTimestamp = Math.floor(todayEnd.getTime() / 1000);

      this.logger.log(`Collecting analytics for WABA ${wabaId} from ${yesterdayStart.toISOString()} to ${todayEnd.toISOString()}`);

      const url = `${this.baseURL}/${wabaId}`;
      const params = {
        fields: `conversation_analytics.start(${startTimestamp}).end(${endTimestamp}).granularity(DAILY).metric_types(['COST','CONVERSATION']).dimensions(['PHONE','CONVERSATION_CATEGORY','CONVERSATION_DIRECTION'])`,
        access_token: this.accessToken,
      };

      const response = await lastValueFrom(
        this.http.get<ConversationAnalyticsResponse>(url, { params })
      );

      if (response.data?.data?.[0]?.data_points) {
        const dataPoints = response.data.data[0].data_points;
        this.logger.log(`Received ${dataPoints.length} data points for WABA ${wabaId}`);

        for (const dataPoint of dataPoints) {
          await this.saveDataPoint(dataPoint);
        }
      } else {
        this.logger.log(`No data points found for WABA ${wabaId}`);
      }
    } catch (error) {
      this.logger.error(`Error collecting analytics for WABA ${wabaId}`, error);
    }
  }

  private async saveDataPoint(dataPoint: ConversationAnalyticsDataPoint): Promise<void> {
    try {
      const dateTimestamp = new Date(dataPoint.start * 1000);
      const date = new Date(Date.UTC(
        dateTimestamp.getUTCFullYear(),
        dateTimestamp.getUTCMonth(),
        dateTimestamp.getUTCDate(),
        0, 0, 0, 0
      ));

      const normalizedPhoneNumber = this.normalizePhoneNumber(dataPoint.phone_number);
      
      const lines = await this.metaLineRepository.find();
      const line = lines.find(l => 
        this.normalizePhoneNumber(l.displayPhoneNumber || '') === normalizedPhoneNumber
      );

      if (!line) {
        this.logger.warn(`Line not found for phone number ${dataPoint.phone_number} (normalized: ${normalizedPhoneNumber}), skipping data point`);
        return;
      }

      const existing = await this.analyticsRepository.findOne({
        where: {
          lineId: line.lineId,
          date: date,
          conversationCategory: dataPoint.conversation_category,
          conversationDirection: dataPoint.conversation_direction,
        },
      });

      if (existing) {
        existing.conversationCount = dataPoint.conversation;
        existing.cost = dataPoint.cost;
        await this.analyticsRepository.save(existing);
        this.logger.debug(`Updated analytics for line ${line.lineId} on ${date.toISOString()}`);
      } else {
        const analytics = this.analyticsRepository.create({
          lineId: line.lineId,
          date: date,
          conversationCategory: dataPoint.conversation_category,
          conversationDirection: dataPoint.conversation_direction,
          conversationCount: dataPoint.conversation,
          cost: dataPoint.cost,
        });
        await this.analyticsRepository.save(analytics);
        this.logger.debug(`Created analytics for line ${line.lineId} on ${date.toISOString()}`);
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

    const lines = await this.metaLineRepository.find({
      where: { wabaId },
    });

    const lineIds = lines.map(line => line.lineId);

    if (lineIds.length === 0) {
      return {};
    }

    const analytics = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .leftJoinAndSelect('analytics.line', 'line')
      .where('analytics.lineId IN (:...lineIds)', { lineIds })
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
    analytics: ConversationAnalyticsEntity[]
  ): WabaAnalyticsResponseDto {
    const result: WabaAnalyticsResponseDto = {};

    for (const item of analytics) {
      const dateStr = item.date.toISOString().split('T')[0];
      const phoneNumber = item.line.displayPhoneNumber;
      const category = item.conversationCategory;
      const direction = item.conversationDirection;

      if (!result[dateStr]) {
        result[dateStr] = {};
      }

      if (!result[dateStr][phoneNumber]) {
        result[dateStr][phoneNumber] = {};
      }

      if (!result[dateStr][phoneNumber][category]) {
        result[dateStr][phoneNumber][category] = {};
      }

      result[dateStr][phoneNumber][category][direction] = {
        conversations: item.conversationCount,
        cost: Number(item.cost),
      };
    }

    return result;
  }
}
