export interface MetaLineRowDto {
  id: string;
  line: string;
  wabaId: string;
  wabaName: string;
  name: string;
  active: string;
  verified: string;
  qualityRating: string;
}

export interface MetaLinesStreamRowEvent {
  type: 'row';
  data: MetaLineRowDto;
}

export interface MetaLinesStreamProgressEvent {
  type: 'progress';
  data: {
    processed: number;
    total: number;
  };
}

export interface MetaLinesStreamCompleteEvent {
  type: 'complete';
  data: {
    cacheKey: string;
    total: number;
  };
}

export type MetaLinesStreamEvent =
  | MetaLinesStreamRowEvent
  | MetaLinesStreamProgressEvent
  | MetaLinesStreamCompleteEvent;

export interface ExportLinesCsvQueryDto {
  cacheKey: string;
}
