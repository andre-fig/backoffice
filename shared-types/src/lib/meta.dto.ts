import { MetaLinesEventType, LineQualityRating, LineConnectionStatus } from './enums';

export interface MetaLineRowDto {
  id: string;
  line: string;
  wabaId: string;
  wabaName: string;
  name: string;
  active: LineConnectionStatus;
  verified: string;
  qualityRating: LineQualityRating;
}

export type MetaLinesStreamEvent =
  | { type: MetaLinesEventType.ROW; data: MetaLineRowDto }
  | { type: MetaLinesEventType.PROGRESS; data: { processed: number; total: number } }
  | { type: MetaLinesEventType.COMPLETE; data: { cacheKey: string; total: number } };

export interface ExportLinesCsvQueryDto {
  cacheKey: string;
}
