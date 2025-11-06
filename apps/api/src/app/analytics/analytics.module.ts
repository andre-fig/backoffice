import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsEntity } from '../../database/db-backoffice/entities/analytics.entity';
import { LineEntity } from '../../database/db-backoffice/entities/line.entity';
import { Datasources } from '../../common/datasources.enum';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { MetaService } from '../meta/meta.service';
import { WabasService } from '../im-wabas/wabas.service';
import { HttpModule } from '@nestjs/axios';
import { WabaEntity } from '../../database/db-backoffice/entities/waba.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [AnalyticsEntity, LineEntity, WabaEntity],
      Datasources.DB_BACKOFFICE
    ),
    HttpModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, MetaService, WabasService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
