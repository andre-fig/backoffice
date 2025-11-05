import { Controller, Get, Param, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { GetWabaAnalyticsQueryDto, WabaAnalyticsResponseDto } from '@backoffice-monorepo/shared-types';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('waba/:wabaId')
  async getWabaAnalytics(
    @Param('wabaId') wabaId: string,
    @Query() query: GetWabaAnalyticsQueryDto
  ): Promise<WabaAnalyticsResponseDto> {
    return this.analyticsService.getWabaAnalytics(
      wabaId,
      query.startDate,
      query.endDate
    );
  }

  @Get('line/:lineId')
  async getLineAnalytics(
    @Param('lineId') lineId: string,
    @Query() query: GetWabaAnalyticsQueryDto
  ): Promise<WabaAnalyticsResponseDto> {
    return this.analyticsService.getLineAnalytics(
      lineId,
      query.startDate,
      query.endDate
    );
  }
}
