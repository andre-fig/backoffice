import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetaService } from './meta.service';
import { MetaController } from './meta.controller';
import { MetaLinesService } from './services/meta-lines.service';
import { CsvExportService } from './services/csv-export.service';
import { MetaSyncService } from './services/meta-sync.service';
import { WabasModule } from '../im-wabas/wabas.module';
import { WabaEntity } from '../../database/db-backoffice/entities/waba.entity';
import { LineEntity } from '../../database/db-backoffice/entities/line.entity';
import { Datasources } from '../../common/datasources.enum';

@Module({
  imports: [
    HttpModule,
    WabasModule,
    TypeOrmModule.forFeature(
      [WabaEntity, LineEntity],
      Datasources.DB_BACKOFFICE
    ),
  ],
  controllers: [MetaController],
  providers: [MetaService, MetaLinesService, CsvExportService, MetaSyncService],
  exports: [MetaService, MetaSyncService],
})
export class MetaModule {}
