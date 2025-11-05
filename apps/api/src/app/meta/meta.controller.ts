import { Controller, Get, Param, Query, Res, Sse, Inject, HttpStatus, HttpException } from '@nestjs/common';
import { Response } from 'express';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Observable, from, concatMap, mergeMap, toArray } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { MetaService } from './meta.service';
import { 
  MetaLineRowDto, 
  MetaLinesStreamEvent,
  ExportLinesCsvQueryDto 
} from '@backoffice-monorepo/shared-types';

@Controller('meta')
export class MetaController {
  constructor(
    private readonly metaService: MetaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
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
    const allRows: MetaLineRowDto[] = [];

    return from(this.metaService.listWabas()).pipe(
      concatMap(wabas => {
        const totalWabas = wabas.length;
        let processedLines = 0;

        return from(wabas).pipe(
          mergeMap(async (waba) => {
            const lines = await this.metaService.listLines(waba.id);

            const lineRows: MetaLineRowDto[] = [];

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              const details = await this.metaService.getPhoneNumberDetails(line.id);

              const row: MetaLineRowDto = {
                id: line.id,
                line: details.display_phone_number ?? line.display_phone_number ?? '',
                wabaId: waba.id,
                wabaName: waba.name ?? '',
                name: details.verified_name ?? line.verified_name ?? '',
                active: (line.status ?? '').toUpperCase(),
                verified: details.is_official_business_account ? 'Sim' : 'Não',
                qualityRating: details.quality_rating ?? line.quality_rating ?? 'N/A',
              };

              lineRows.push(row);
              allRows.push(row);
              processedLines++;
            }

            return { lineRows, processedLines };
          }, 5)
        );
      }),
      concatMap(async ({ lineRows, processedLines }) => {
        const events: MessageEvent<MetaLinesStreamEvent>[] = [];

        for (const row of lineRows) {
          events.push({
            type: 'message',
            data: { type: 'row', data: row },
          } as MessageEvent<MetaLinesStreamEvent>);
        }

        events.push({
          type: 'message',
          data: { 
            type: 'progress', 
            data: { processed: processedLines, total: processedLines } 
          },
        } as MessageEvent<MetaLinesStreamEvent>);

        return events;
      }),
      mergeMap(events => from(events)),
      toArray(),
      concatMap(async (allEvents) => {
        await this.cacheManager.set(cacheKey, allRows, 21600000);

        allEvents.push({
          type: 'message',
          data: { 
            type: 'complete', 
            data: { cacheKey, total: allRows.length } 
          },
        } as MessageEvent<MetaLinesStreamEvent>);

        return allEvents;
      }),
      mergeMap(events => from(events))
    );
  }

  @Get('export/lines')
  async exportLines(
    @Query() query: ExportLinesCsvQueryDto,
    @Res() res: Response
  ) {
    const { cacheKey } = query;

    if (!cacheKey) {
      const rows = await this.buildAllRows();
      const csvContent = this.buildCsv(rows);
      this.sendCsvResponse(res, csvContent);
      return;
    }

    const cachedRows = await this.cacheManager.get<MetaLineRowDto[]>(cacheKey);

    if (!cachedRows) {
      throw new HttpException(
        'Cache expirado ou inválido. Por favor, recarregue os dados.',
        HttpStatus.GONE
      );
    }

    const csvContent = this.buildCsv(cachedRows);
    this.sendCsvResponse(res, csvContent);
  }

  private async buildAllRows(): Promise<MetaLineRowDto[]> {
    const wabas = await this.metaService.listWabas();
    const rows: MetaLineRowDto[] = [];

    for (const waba of wabas) {
      const lines = await this.metaService.listLines(waba.id);
      
      for (const line of lines) {
        const details = await this.metaService.getPhoneNumberDetails(line.id);

        rows.push({
          id: line.id,
          line: details.display_phone_number ?? line.display_phone_number ?? '',
          wabaId: waba.id,
          wabaName: waba.name ?? '',
          name: details.verified_name ?? line.verified_name ?? '',
          active: (line.status ?? '').toUpperCase(),
          verified: details.is_official_business_account ? 'Sim' : 'Não',
          qualityRating: details.quality_rating ?? line.quality_rating ?? 'N/A',
        });
      }
    }

    return rows;
  }

  private buildCsv(rows: MetaLineRowDto[]): string {
    const headers = [
      'ID',
      'Linha',
      'idWaba',
      'Waba',
      'Nome',
      'Ativa',
      'Verificada (selo azul)',
      'Qualidade da Linha',
    ];

    const escapeCsv = (value: unknown): string => {
      let s: string;
      if (value === null || value === undefined) {
        s = '';
      } else if (typeof value === 'string') {
        s = value;
      } else if (
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'bigint'
      ) {
        s = String(value);
      } else if (typeof value === 'object') {
        try {
          s = JSON.stringify(value);
        } catch {
          s = '';
        }
      } else {
        s = '';
      }

      if (/[",\n;]/.test(s)) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const csvLines: string[] = [];
    csvLines.push(headers.join(','));

    for (const r of rows) {
      csvLines.push(
        [
          escapeCsv(r.id),
          escapeCsv(r.line.replace(/\D/g, '')),
          escapeCsv(r.wabaId),
          escapeCsv(r.wabaName),
          escapeCsv(r.name),
          escapeCsv(r.active),
          escapeCsv(r.verified),
          escapeCsv(r.qualityRating),
        ].join(',')
      );
    }

    return '\uFEFF' + csvLines.join('\n');
  }

  private sendCsvResponse(res: Response, csvContent: string): void {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="linhas-meta.csv"'
    );
    res.send(csvContent);
  }
}
