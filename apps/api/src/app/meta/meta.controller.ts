import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  Sse,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { MetaService } from './meta.service';
import { MetaLinesService } from './services/meta-lines.service';
import { CsvExportService } from './services/csv-export.service';
import {
  MetaLinesStreamEvent,
  ExportLinesCsvQueryDto,
} from '@backoffice-monorepo/shared-types';

@Controller('meta')
export class MetaController {
  constructor(
    private readonly metaService: MetaService,
    private readonly metaLinesService: MetaLinesService,
    private readonly csvExportService: CsvExportService
  ) {}

  @Get('wabas')
  async getWabas() {
    return this.metaService.listWabas();
  }

  @Get('wabas/:wabaId/lines')
  async getLines(@Param('wabaId') wabaId: string) {
    return this.metaService.listLines(wabaId);
  }

  @Sse('lines/stream')
  streamLines(): Observable<MessageEvent<MetaLinesStreamEvent>> {
    const cacheKey = uuidv4();
    return this.metaLinesService.streamAllLines(cacheKey);
  }

  @Get('export/lines')
  async exportLines(
    @Query() query: ExportLinesCsvQueryDto,
    @Res() response: Response
  ) {
    const { cacheKey } = query;

    let rows;
    if (!cacheKey) {
      rows = await this.metaLinesService.buildAllRows();
    } else {
      const cachedRows = await this.metaLinesService.getCachedRows(cacheKey);
      if (!cachedRows) {
        throw new HttpException(
          'Cache expirado ou inválido. Por favor, recarregue os dados.',
          HttpStatus.GONE
        );
      }
      rows = cachedRows;
    }

    const csvContent = this.csvExportService.buildCsv(rows);
    
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="linhas-meta.csv"'
    );
    response.send(csvContent);
  }
}
