import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig, AxiosResponse, isAxiosError } from 'axios';
import { lastValueFrom } from 'rxjs';
import { VdiUserResponseDto } from './dto/vdi-user-response.dto';
import { MethodsEnum, VdiUsersDto } from '@backoffice-monorepo/shared-types';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class VdiService {
  private readonly logger = new Logger(VdiService.name);
  private readonly VDI_CORE_USERS_URL =
    'https://hvdi-core-users.venda-direta.grupoboticario.digital';

  private token: string | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly authService: AuthService
  ) {}

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

        const token = await this.authService.login();
        this.token = token.token;

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

  async getUsers(options: {
    filter?: string;
    perPage?: number;
    direction?: string;
  }): Promise<VdiUsersDto> {
    return this.request<VdiUsersDto>(MethodsEnum.GET, `/admin/users`, {
      params: options,
    });
  }
}
