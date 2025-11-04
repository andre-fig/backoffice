import { Controller, HttpCode, HttpStatus, Get, Query } from '@nestjs/common';
import { VdiService } from './vdi.service';
import { VdiUsersDto } from '@backoffice-monorepo/shared-types';

@Controller('vdi')
export class VdiController {
  constructor(private readonly vdiService: VdiService) {}

  @Get('users')
  @HttpCode(HttpStatus.OK)
  async getUsers(
    @Query('filter') filter?: string,
    @Query('perPage') perPage = '25'
  ): Promise<VdiUsersDto> {
    return await this.vdiService.getUsers({
      filter,
      perPage: Number(perPage),
    });
  }
}
