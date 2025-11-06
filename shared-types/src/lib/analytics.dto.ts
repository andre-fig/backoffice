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

export interface WabaAnalyticsResponseDto {
  id: string;
  lineId: string;
  date: string;
  pricingCategory: string;
  pricingType: string;
  volume: number;
  cost: number;
}
