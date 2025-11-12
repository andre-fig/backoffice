import {
  MetaLinesEventType,
  LineQualityRating,
  LineConnectionStatus,
} from './enums';

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

export interface PricingDataPoint {
  start: number;
  end: number;
  phone_number: string;
  pricing_type: string;
  pricing_category: string;
  volume: number;
  cost: number;
}

export interface PricingAnalyticsResponse {
  pricing_analytics: {
    data: [
      {
        data_points: PricingDataPoint[];
      }
    ];
  };
  id: string;
}

export interface MetaTemplate {
  id?: string;
  name: string;
  status?: string;
  language?: string;
  category?: string;
  [key: string]: unknown;
}

export interface TemplateAnalyticsCostEntry {
  type: string;
  value: number;
}

export interface TemplateAnalyticsDataPoint {
  template_id: string;
  start: number;
  end: number;
  sent?: number;
  delivered?: number;
  read?: number;
  cost?: TemplateAnalyticsCostEntry[];
}

export interface TemplateAnalyticsResponse {
  data: Array<{
    granularity: string;
    product_type?: string;
    data_points: TemplateAnalyticsDataPoint[];
  }>;
}

export interface MetaLineRowDto {
  id: string;
  externalId: string;
  line: string;
  wabaId: string;
  wabaName: string;
  name: string;
  nameStatus: string;
  active: LineConnectionStatus;
  verified: string;
  qualityRating: LineQualityRating;
}

export type MetaLinesStreamEvent =
  | { type: MetaLinesEventType.ROW; data: MetaLineRowDto }
  | {
      type: MetaLinesEventType.PROGRESS;
      data: { processed: number; total: number };
    }
  | {
      type: MetaLinesEventType.COMPLETE;
      data: { cacheKey: string; total: number };
    };

export interface ExportLinesCsvQueryDto {
  cacheKey: string;
}
