export interface ConversationAnalyticsDto {
  lineId: string;
  date: string;
  pricingCategory: string;
  pricingType: string;
  conversationCount: number;
  cost: number;
}

export interface GetWabaAnalyticsQueryDto {
  startDate?: string;
  endDate?: string;
}

export interface DirectionData {
  volume: number;
  cost: number;
}

export interface CategoryData {
  [direction: string]: DirectionData;
}

export interface LineData {
  [category: string]: CategoryData;
}

export interface DateData {
  [phoneNumber: string]: LineData;
}

export interface WabaAnalyticsResponseDto {
  [date: string]: DateData;
}
