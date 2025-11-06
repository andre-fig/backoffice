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

export enum LineNameStatus {
  DECLINED = 'DECLINED',
  NON_EXISTS = 'NON_EXISTS',
  APPROVED = 'APPROVED',
  AVAILABLE_WITHOUT_REVIEW = 'AVAILABLE_WITHOUT_REVIEW',
  UNKNOWN = 'UNKNOWN',
}

export enum PricingCategory {
  UTILITY = 'UTILITY',
  MARKETING = 'MARKETING',
  SERVICE = 'SERVICE',
  AUTHENTICATION = 'AUTHENTICATION',
  MARKETING_LITE = 'MARKETING_LITE',
  UNKNOWN = 'UNKNOWN',
}

export enum PricingType {
  REGULAR = 'REGULAR',
  FREE_ENTRY_POINT = 'FREE_ENTRY_POINT',
  FREE_CUSTOMER_SERVICE = 'FREE_CUSTOMER_SERVICE',
  UNKNOWN = 'UNKNOWN',
}
