import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  Observable,
  from,
  of,
  defer,
  concatWith,
  concatMap,
  mergeMap,
  tap,
} from 'rxjs';
import { MetaService } from '../meta.service';
import { ImWabasService } from '../../im-wabas/im-wabas.service';
import { MetaSyncService } from './meta-sync.service';
import {
  MetaLineRowDto,
  MetaLinesStreamEvent,
  MetaLinesEventType,
  LineQualityRating,
  LineConnectionStatus,
} from '@backoffice-monorepo/shared-types';

@Injectable()
export class MetaLinesService {
  SIX_HOURS_IN_MS = 6 * 60 * 60 * 1000;
  private readonly cacheTtl = this.SIX_HOURS_IN_MS;

  constructor(
    private readonly metaService: MetaService,
    private readonly imWabasService: ImWabasService,
    private readonly metaSyncService: MetaSyncService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) {}

  streamAllLines(
    cacheKey: string
  ): Observable<MessageEvent<MetaLinesStreamEvent>> {
    const allRows: MetaLineRowDto[] = [];

    return from(this.getFilteredWabas()).pipe(
      concatMap((wabas) => {
        let processedLines = 0;

        return from(wabas).pipe(
          mergeMap(async (waba) => {
            const lines = await this.metaSyncService.getLinesForWaba(
              waba.wabaId
            );
            const lineRows: MetaLineRowDto[] = [];

            for (const line of lines) {
              const statusString = (line.status ?? '').toUpperCase();
              const qualityString = (line.qualityRating || '').trim();

              const row: MetaLineRowDto = {
                id: line.id,
                externalId: line.externalId,
                line: line.displayPhoneNumber || '',
                wabaId: waba.wabaId,
                wabaName: waba.wabaName,
                name: line.verifiedName || '',
                active: this.normalizeConnectionStatus(statusString),
                verified: line.isOfficialBusinessAccount ? 'Sim' : 'Não',
                qualityRating: this.normalizeQualityRating(qualityString),
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
            data: { type: MetaLinesEventType.ROW, data: row },
          } as MessageEvent<MetaLinesStreamEvent>);
        }

        events.push({
          type: 'message',
          data: {
            type: MetaLinesEventType.PROGRESS,
            data: { processed: processedLines, total: processedLines },
          },
        } as MessageEvent<MetaLinesStreamEvent>);

        return events;
      }),
      mergeMap((events) => from(events)),
      tap({
        complete: () => {
          this.cacheManager.set(cacheKey, allRows, this.cacheTtl);
        },
      }),
      concatWith(
        defer(() =>
          of({
            type: 'message',
            data: {
              type: MetaLinesEventType.COMPLETE,
              data: { cacheKey, total: allRows.length },
            },
          } as MessageEvent<MetaLinesStreamEvent>)
        )
      )
    );
  }

  async buildAllRows(): Promise<MetaLineRowDto[]> {
    const wabas = await this.getFilteredWabas();
    const rows: MetaLineRowDto[] = [];

    for (const waba of wabas) {
      const lines = await this.metaSyncService.getLinesForWaba(waba.wabaId);

      for (const line of lines) {
        const statusString = (line.status ?? '').toUpperCase();
        const qualityString = (line.qualityRating || '').trim();

        rows.push({
          id: line.id,
          externalId: line.externalId,
          line: line.displayPhoneNumber || '',
          wabaId: waba.wabaId,
          wabaName: waba.wabaName,
          name: line.verifiedName || '',
          active: this.normalizeConnectionStatus(statusString),
          verified: line.isOfficialBusinessAccount ? 'Sim' : 'Não',
          qualityRating: this.normalizeQualityRating(qualityString),
        });
      }
    }

    return rows;
  }

  async getCachedRows(cacheKey: string): Promise<MetaLineRowDto[] | undefined> {
    return this.cacheManager.get<MetaLineRowDto[]>(cacheKey);
  }

  private async getFilteredWabas() {
    return this.imWabasService.getVisibleWabas();
  }

  private normalizeQualityRating(rating: string): LineQualityRating {
    const upperRating = (rating ?? '').toString().trim().toUpperCase();

    if (upperRating === 'GREEN') return LineQualityRating.HIGH;
    if (upperRating === 'YELLOW') return LineQualityRating.MEDIUM;
    if (upperRating === 'RED') return LineQualityRating.LOW;

    return LineQualityRating.UNKNOWN;
  }

  private normalizeConnectionStatus(status: string): LineConnectionStatus {
    const upperStatus = (status ?? '').toString().trim().toUpperCase();

    if (upperStatus === 'CONNECTED') return LineConnectionStatus.CONNECTED;
    if (upperStatus === 'PENDING') return LineConnectionStatus.PENDING;
    if (upperStatus === 'FLAGGED') return LineConnectionStatus.FLAGGED;
    if (upperStatus === 'MIGRATED') return LineConnectionStatus.MIGRATED;
    if (upperStatus === 'DISCONNECTED')
      return LineConnectionStatus.DISCONNECTED;

    return LineConnectionStatus.UNKNOWN;
  }
}
