import { Controller, Get, Param, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { GetWabaAnalyticsQueryDto } from '@backoffice-monorepo/shared-types';
import { AnalyticsEntity } from '../../database/db-backoffice/entities/analytics.entity';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('line/:lineId')
  async getLineAnalytics(
    @Param('lineId') lineId: string,
    @Query() query: GetWabaAnalyticsQueryDto
  ): Promise<AnalyticsEntity[]> {
    return this.analyticsService.getLineAnalytics(
      lineId,
      query.startDate,
      query.endDate
    );
  }
}
