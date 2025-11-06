import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthService {
  constructor(private readonly httpService: HttpService) {}

  async login(): Promise<{ token: string }> {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.AZURE_CLIENT_ID,
      client_secret: process.env.AZURE_CLIENT_SECRET,
      scope: process.env.AZURE_TOKEN_SCOPE,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post(process.env.AZURE_TOKEN_URL, body.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );

      const { access_token, expires_in } = response.data;

      if (!access_token || typeof expires_in !== 'number') {
        throw new Error('Resposta de token inválida ou mal formatada do Azure');
      }

      return {
        token: access_token,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Falha ao obter token do Azure: ${
          error instanceof Error ? error.message : 'Erro desconhecido'
        }`
      );
    }
  }
}
