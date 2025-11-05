import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MetaService } from './meta.service';
import { MetaController } from './meta.controller';
import { MetaLinesService } from './services/meta-lines.service';
import { CsvExportService } from './services/csv-export.service';
import { ImWabasModule } from '../im-wabas/im-wabas.module';

@Module({
  imports: [HttpModule, ImWabasModule],
  controllers: [MetaController],
  providers: [MetaService, MetaLinesService, CsvExportService],
  exports: [MetaService],
})
export class MetaModule {}
