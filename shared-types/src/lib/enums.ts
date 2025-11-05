export enum RedirectStatus {
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum MetaLinesEventType {
  ROW = 'row',
  PROGRESS = 'progress',
  COMPLETE = 'complete',
}

export enum LineQualityRating {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  UNKNOWN = 'UNKNOWN',
}

export enum LineConnectionStatus {
  CONNECTED = 'CONNECTED',
  PENDING = 'PENDING',
  FLAGGED = 'FLAGGED',
  MIGRATED = 'MIGRATED',
  DISCONNECTED = 'DISCONNECTED',
  UNKNOWN = 'UNKNOWN',
}
