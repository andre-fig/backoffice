import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ImWabasService } from './im-wabas.service';
import { AddImWabaDto, ImWabaDto, UpdateImWabaVisibilityDto } from '@backoffice-monorepo/shared-types';

@Controller('im-wabas')
export class ImWabasController {
  constructor(private readonly imWabasService: ImWabasService) {}

  @Get()
  async findAll(): Promise<ImWabaDto[]> {
    return this.imWabasService.findAll();
  }

  @Get('visible')
  async findVisible(): Promise<ImWabaDto[]> {
    return this.imWabasService.getVisibleWabas();
  }

  @Post()
  async add(@Body() dto: AddImWabaDto): Promise<ImWabaDto> {
    return this.imWabasService.add(dto);
  }

  @Patch(':wabaId/visibility')
  async updateVisibility(
    @Param('wabaId') wabaId: string,
    @Body() dto: { isVisible: boolean }
  ): Promise<ImWabaDto> {
    return this.imWabasService.updateVisibility({ wabaId, isVisible: dto.isVisible });
  }

  @Delete(':wabaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('wabaId') wabaId: string): Promise<void> {
    return this.imWabasService.remove(wabaId);
  }
}
