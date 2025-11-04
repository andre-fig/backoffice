import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { RedirectsService } from './redirects.service';
import { RedirectChatsDto } from '@backoffice-monorepo/shared-types';

@Controller('redirects')
export class RedirectsController {
  constructor(private readonly redirectsService: RedirectsService) {}

  @Post('chats')
  @HttpCode(HttpStatus.OK)
  async redirectUserChats(@Body() redirectChatsDto: RedirectChatsDto): Promise<{
    message: string;
  }> {
    return await this.redirectsService.redirectUserChats(redirectChatsDto);
  }
}
