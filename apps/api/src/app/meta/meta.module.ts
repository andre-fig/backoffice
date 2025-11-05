import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetaService } from './meta.service';
import { MetaController } from './meta.controller';
import { MetaLinesService } from './services/meta-lines.service';
import { CsvExportService } from './services/csv-export.service';
import { MetaSyncService } from './services/meta-sync.service';
import { ImWabasModule } from '../im-wabas/im-wabas.module';
import { ImWabaEntity } from '../../database/db-backoffice/entities/im-waba.entity';
import { MetaLineEntity } from '../../database/db-backoffice/entities/meta-line.entity';
import { Datasources } from '../../common/datasources.enum';

@Module({
  imports: [
    HttpModule,
    ImWabasModule,
    TypeOrmModule.forFeature([ImWabaEntity, MetaLineEntity], Datasources.DB_BACKOFFICE),
  ],
  controllers: [MetaController],
  providers: [MetaService, MetaLinesService, CsvExportService, MetaSyncService],
  exports: [MetaService, MetaSyncService],
})
export class MetaModule {}
