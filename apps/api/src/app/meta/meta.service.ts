import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { lastValueFrom } from 'rxjs';

interface Waba {
  id: string;
  name?: string;
  [key: string]: unknown;
}

interface PhoneNumber {
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
}

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

  private async request<R>(
    url: string,
    params: Record<string, string> = {}
  ): Promise<R> {
    if (!this.accessToken) {
      throw new InternalServerErrorException(
        'META_ACCESS_TOKEN não configurado'
      );
    }
    const config: AxiosRequestConfig = {
      baseURL: this.baseURL,
      method: 'get',
      url,
      params: { access_token: this.accessToken, ...params },
    };
    try {
      const res = await lastValueFrom<AxiosResponse<R>>(
        this.http.request<R>(config)
      );
      return res.data;
    } catch (err) {
      this.logger.error(
        `Erro ao chamar Meta API ${url}: ${(err as Error).message}`
      );
      throw new InternalServerErrorException(
        'Falha ao comunicar com a API da Meta'
      );
    }
  }

  async listWabas(): Promise<Waba[]> {
    if (!this.businessId) {
      // Tentativa alternativa: /me/owned_whatsapp_business_accounts
      const data = await this.request<{ data: Waba[] }>(
        `/me/owned_whatsapp_business_accounts`,
        {
          fields: 'id,name',
        }
      );
      return data?.data ?? [];
    }
    const data = await this.request<{ data: Waba[] }>(
      `/${this.businessId}/owned_whatsapp_business_accounts`,
      {
        fields: 'id,name',
      }
    );
    return data?.data ?? [];
  }

  async listLines(wabaId: string): Promise<PhoneNumber[]> {
    const data = await this.request<{ data: PhoneNumber[] }>(
      `/${wabaId}/phone_numbers`,
      {
        fields: 'id,display_phone_number,verified_name,status,quality_rating',
      }
    );
    return data?.data ?? [];
  }

  async getPhoneNumberDetails(
    phoneNumberId: string
  ): Promise<PhoneNumberDetails> {
    return this.request<PhoneNumberDetails>(`/${phoneNumberId}`, {
      fields:
        'id,display_phone_number,verified_name,name_status,is_official_business_account',
    });
  }
}
