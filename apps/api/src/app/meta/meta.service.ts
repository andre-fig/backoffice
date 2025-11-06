import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { lastValueFrom } from 'rxjs';
import {
  Waba,
  PhoneNumber,
  PhoneNumberDetails,
  MethodsEnum,
  PricingAnalyticsResponse,
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

type QueryParams = Record<string, string | number | undefined>;

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);
  private readonly baseURL: string;
  private readonly accessToken: string;
  private readonly businessId: string;
  private readonly allowedWabaIds: Set<string>;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService
  ) {
    const version = this.config.get<string>('META_GRAPH_VERSION') ?? 'v20.0';
    this.baseURL = `https://graph.facebook.com/${version}`;
    this.accessToken = this.config.get<string>('META_ACCESS_TOKEN') ?? '';
    this.businessId = this.config.get<string>('META_BUSINESS_ID') ?? '';
    const allowed = (this.config.get<string>('META_ALLOWED_WABA_IDS') ?? '')
      .split(',')
      .map((idString) => idString.trim())
      .filter(Boolean);
    this.allowedWabaIds = new Set<string>(allowed);
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
        `Falha ao comunicar com a API da Meta: ${(error as AxiosError).message}`
      );
    }
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
    const wabas = await this.requestAllPages<Waba>(
      `/${this.businessId}/owned_whatsapp_business_accounts`,
      {
        fields: 'id,name',
      }
    );
    if (this.allowedWabaIds.size === 0) return wabas;
    return wabas.filter((waba) => this.allowedWabaIds.has(waba.id));
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
}
