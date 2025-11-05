import { MetaLinesEventType, LineQualityRating, LineConnectionStatus } from './enums';

export interface Waba {
  id: string;
  name?: string;
  [key: string]: unknown;
}

export interface PhoneNumber {
  id: string;
  display_phone_number?: string;
  verified_name?: string;
  status?: string;
  quality_rating?: string;
  [key: string]: unknown;
}

export interface PhoneNumberDetails {
  id: string;
  display_phone_number?: string;
  verified_name?: string;
  name_status?: string;
  is_official_business_account?: boolean;
  quality_rating?: string;
}

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

export interface MetaLineDto {
  lineId: string;
  wabaId: string;
  displayPhoneNumber: string;
  verifiedName: string;
  nameStatus: string;
  status: string;
  qualityRating: string;
  isOfficialBusinessAccount: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
