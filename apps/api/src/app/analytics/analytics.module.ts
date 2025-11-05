import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConversationAnalyticsEntity } from '../../database/db-backoffice/entities/conversation-analytics.entity';
import { MetaLineEntity } from '../../database/db-backoffice/entities/meta-line.entity';
import { Datasources } from '../../common/datasources.enum';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { ImWabasModule } from '../im-wabas/im-wabas.module';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [ConversationAnalyticsEntity, MetaLineEntity],
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
