import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { lastValueFrom } from 'rxjs';
import {
  Waba,
  PhoneNumber,
  PhoneNumberDetails,
  MethodsEnum,
  PricingAnalyticsResponse,
  MetaTemplate,
  TemplateAnalyticsResponse,
} from '@backoffice-monorepo/shared-types';

interface GraphApiResponse<T> {
  data: T[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

type QueryParams = Record<string, string | number | boolean | undefined>;

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);
  private readonly baseURL: string;
  private readonly accessToken: string;
  private readonly businessId: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService
  ) {
    const version = this.config.get<string>('META_GRAPH_VERSION') ?? 'v20.0';
    this.baseURL = `https://graph.facebook.com/${version}`;
    this.accessToken = this.config.get<string>('META_ACCESS_TOKEN') ?? '';
    this.businessId = this.config.get<string>('META_BUSINESS_ID') ?? '';
  }

  private async request<R>(url: string, params: QueryParams = {}): Promise<R> {
    if (!this.accessToken) {
      this.logger.error('META_ACCESS_TOKEN não configurado');
      throw new InternalServerErrorException(
        'META_ACCESS_TOKEN não configurado'
      );
    }

    const config: AxiosRequestConfig = {
      baseURL: this.baseURL,
      method: MethodsEnum.GET,
      url,
      params: { access_token: this.accessToken, ...params },
    };

    try {
      const response = await lastValueFrom<AxiosResponse<R>>(
        this.http.request<R>(config)
      );
      return response.data;
    } catch (error) {
      throw new InternalServerErrorException(
        `Falha inesperada na requisição: ${(error as Error).message}`
      );
    }
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private async requestAllPages<T>(
    path: string,
    params: QueryParams = {}
  ): Promise<T[]> {
    const allItems: T[] = [];
    let afterCursor: string | undefined = undefined;

    do {
      const queryParams: QueryParams = {
        ...params,
        limit: params.limit || 100,
      };

      if (afterCursor) {
        queryParams.after = afterCursor;
      }

      const response = await this.request<GraphApiResponse<T>>(
        path,
        queryParams
      );

      if (response?.data) {
        allItems.push(...response.data);
      }

      afterCursor = response?.paging?.cursors?.after;
    } while (afterCursor);

    return allItems;
  }

  async listWabas(): Promise<Waba[]> {
    return await this.requestAllPages<Waba>(
      `/${this.businessId}/owned_whatsapp_business_accounts`,
      {
        fields: 'id,name',
      }
    );
  }

  async listLines(wabaId: string): Promise<PhoneNumber[]> {
    return this.requestAllPages<PhoneNumber>(`/${wabaId}/phone_numbers`, {
      fields: 'id,display_phone_number,verified_name,status,quality_rating',
    });
  }

  async getPhoneNumberDetails(
    phoneNumberId: string
  ): Promise<PhoneNumberDetails> {
    return this.request<PhoneNumberDetails>(`/${phoneNumberId}`, {
      fields:
        'id,display_phone_number,verified_name,name_status,is_official_business_account,quality_rating',
    });
  }

  async getAnalytics(
    wabaId: string,
    since: Date,
    until: Date
  ): Promise<PricingAnalyticsResponse> {
    const startTimestamp = Math.floor(since.getTime() / 1000);
    const endTimestamp = Math.floor(until.getTime() / 1000);

    return await this.request<PricingAnalyticsResponse>(`/${wabaId}`, {
      fields:
        `pricing_analytics` +
        `.start(${startTimestamp})` +
        `.end(${endTimestamp})` +
        `.granularity(DAILY)` +
        `.dimensions(PHONE,PRICING_CATEGORY,PRICING_TYPE)`,
    });
  }

  async listTemplates(wabaId: string): Promise<MetaTemplate[]> {
    return this.requestAllPages<MetaTemplate>(`/${wabaId}/message_templates`, {
      fields: 'id,name,status,language,category',
    });
  }

  async getTemplateAnalytics(
    wabaId: string,
    externalIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<TemplateAnalyticsResponse> {
    if (!externalIds.length) {
      return { data: [] };
    }

    return this.request<TemplateAnalyticsResponse>(
      `/${wabaId}/template_analytics`,
      {
        start: this.formatDate(startDate),
        end: this.formatDate(endDate),
        granularity: 'DAILY',
        template_ids: JSON.stringify(externalIds),
        metric_types: JSON.stringify(['SENT', 'DELIVERED', 'READ', 'COST']),
        use_waba_timezone: true,
      }
    );
  }
}
