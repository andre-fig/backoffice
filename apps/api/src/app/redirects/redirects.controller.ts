import { Controller, Post, Body, HttpCode, HttpStatus, Get, Delete, Patch, Param, Query } from '@nestjs/common';
import { RedirectsService } from './redirects.service';
import { 
  RedirectChatsDto, 
  CreateScheduledRedirectDto, 
  UpdateRedirectEndDateDto,
  RedirectListResponseDto 
} from '@backoffice-monorepo/shared-types';

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

  @Get()
  @HttpCode(HttpStatus.OK)
  async listAllRedirects(): Promise<RedirectListResponseDto[]> {
    return await this.redirectsService.listAllRedirects();
  }

  @Post('scheduled')
  @HttpCode(HttpStatus.CREATED)
  async createScheduledRedirect(@Body() dto: CreateScheduledRedirectDto) {
    return await this.redirectsService.createScheduledRedirect(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async removeRedirect(
    @Param('id') id: string,
    @Query('scheduled') scheduled?: string
  ): Promise<{ message: string }> {
    const isScheduled = scheduled === 'true';
    return await this.redirectsService.removeRedirect(id, isScheduled);
  }

  @Patch(':id/end-date')
  @HttpCode(HttpStatus.OK)
  async updateRedirectEndDate(
    @Param('id') id: string,
    @Body() dto: UpdateRedirectEndDateDto
  ) {
    return await this.redirectsService.updateRedirectEndDate(id, dto);
  }

  @Get('users/:userId/sectors')
  @HttpCode(HttpStatus.OK)
  async getUserSectors(@Param('userId') userId: string) {
    return await this.redirectsService.getUserSectors(userId);
  }
}
