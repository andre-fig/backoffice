import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { AnalyticsEntity } from '../../database/db-backoffice/entities/analytics.entity';
import { LineEntity } from '../../database/db-backoffice/entities/line.entity';
import { Datasources } from '../../common/datasources.enum';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { ImWabasModule } from '../im-wabas/im-wabas.module';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [AnalyticsEntity, LineEntity],
      Datasources.DB_BACKOFFICE
    ),
    HttpModule,
    ImWabasModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
