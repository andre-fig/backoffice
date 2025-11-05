import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Observable, from, concatMap, mergeMap } from 'rxjs';
import { MetaService } from '../meta.service';
import { MetaLineRowDto, MetaLinesStreamEvent } from '@backoffice-monorepo/shared-types';

@Injectable()
export class MetaLinesService {
  private readonly logger = new Logger(MetaLinesService.name);
  private readonly cacheTtl = 21600000; // 6 hours

  constructor(
    private readonly metaService: MetaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) {}

  streamAllLines(cacheKey: string): Observable<MessageEvent<MetaLinesStreamEvent>> {
    const allRows: MetaLineRowDto[] = [];

    return from(this.metaService.listWabas()).pipe(
      concatMap((wabas) => {
        let processedLines = 0;

        return from(wabas).pipe(
          mergeMap(async (waba) => {
            const lines = await this.metaService.listLines(waba.id);
            const lineRows: MetaLineRowDto[] = [];

            for (const line of lines) {
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
            data: { processed: processedLines, total: processedLines },
          },
        } as MessageEvent<MetaLinesStreamEvent>);

        return events;
      }),
      mergeMap((events) => from(events)),
      concatMap(async (allEvents) => {
        await this.cacheManager.set(cacheKey, allRows, this.cacheTtl);

        const completeEvent: MessageEvent<MetaLinesStreamEvent> = {
          type: 'message',
          data: {
            type: 'complete',
            data: { cacheKey, total: allRows.length },
          },
        } as MessageEvent<MetaLinesStreamEvent>;

        return [...allEvents, completeEvent];
      }),
      mergeMap((events) => from(events))
    );
  }

  async buildAllRows(): Promise<MetaLineRowDto[]> {
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

  async getCachedRows(cacheKey: string): Promise<MetaLineRowDto[] | undefined> {
    return this.cacheManager.get<MetaLineRowDto[]>(cacheKey);
  }
}
