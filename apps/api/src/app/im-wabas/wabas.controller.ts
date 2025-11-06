import { Controller, Get, Patch, Body, Param } from '@nestjs/common';
import { WabasService } from './wabas.service';

import { WabaEntity } from '../../database/db-backoffice/entities/waba.entity';

@Controller('wabas')
export class WabasController {
  constructor(private readonly wabasService: WabasService) {}

  @Get()
  async findAll(): Promise<WabaEntity[]> {
    return this.wabasService.findAll();
  }

  @Patch(':id/visibility')
  async updateVisibility(
    @Param('id') id: string,
    @Body() dto: { isVisible: boolean }
  ): Promise<WabaEntity> {
    return this.wabasService.updateVisibility({
      id,
      isVisible: dto.isVisible,
    });
  }
}
