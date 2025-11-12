import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateEntity } from '../../database/db-backoffice/entities/template.entity';
import { TemplateAnalyticsEntity } from '../../database/db-backoffice/entities/template-analytics.entity';
import { Datasources } from '../../common/datasources.enum';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { WabasModule } from '../wabas/wabas.module';
import { MetaModule } from '../meta/meta.module';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [TemplateEntity, TemplateAnalyticsEntity],
      Datasources.DB_BACKOFFICE
    ),
    WabasModule,
    MetaModule,
  ],
  controllers: [TemplatesController],
  providers: [TemplatesService],
})
export class TemplatesModule {}
