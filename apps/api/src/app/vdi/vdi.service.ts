import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig, AxiosResponse, isAxiosError } from 'axios';
import { lastValueFrom } from 'rxjs';
import { chromium, Browser } from 'playwright';
import { VdiUserResponseDto } from './dto/vdi-user-response.dto';
import { MethodsEnum } from '@backoffice-monorepo/shared-types';

@Injectable()
export class VdiService {
  private readonly logger = new Logger(VdiService.name);
  private readonly LOCAL_STORAGE_KEY = 'INSERT_LOCALSTORAGE_KEY';
  private readonly VDI_API_URL =
    'https://vdi.venda-direta.grupoboticario.digital';
  private readonly VDI_CORE_USERS_URL =
    'https://vdi-core-users.venda-direta.grupoboticario.digital';

  private token: string | null = null;

  constructor(private readonly httpService: HttpService) {}

  private async login(): Promise<void> {
    let browser: Browser | null = null;
    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();

      await page.goto(this.VDI_API_URL, { waitUntil: 'domcontentloaded' });

      const token = await page.evaluate(
        (key: string) => window.localStorage.getItem(key),
        this.LOCAL_STORAGE_KEY
      );

      if (!token) {
        throw new InternalServerErrorException(
          `Token não encontrado no localStorage na chave: ${this.LOCAL_STORAGE_KEY}.`
        );
      }

      this.token = token;
      this.logger.debug('Token VDI obtido com sucesso.');
    } catch (error) {
      throw new InternalServerErrorException(
        `Falha ao obter token VDI via Playwright: ${(error as Error).message}`
      );
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private async request<R, D = unknown>(
    method: MethodsEnum,
    url: string,
    { data, params }: { data?: D; params?: Record<string, unknown> } = {},
    _retried = false
  ): Promise<R> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    const config: AxiosRequestConfig<D> = {
      baseURL: this.VDI_CORE_USERS_URL,
      method,
      url,
      params,
      ...(data ? { data } : {}),
      headers,
    };

    try {
      const response = await lastValueFrom<AxiosResponse<R>>(
        this.httpService.request<R>(config)
      );

      return response.data;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401 && !_retried) {
        this.logger.warn('Token expirado. Realizando novo login...');

        await this.login();
        return this.request<R, D>(method, url, { data, params }, true);
      }

      throw new InternalServerErrorException(
        `Erro na requisição VDI: ${(error as Error).message}`
      );
    }
  }

  async getUserById(userId: string): Promise<VdiUserResponseDto> {
    return this.request<VdiUserResponseDto>(
      MethodsEnum.GET,
      `/admin/users/${encodeURIComponent(userId)}`
    );
  }
}
