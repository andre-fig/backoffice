import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ImWabasService } from './im-wabas.service';
import { AddImWabaDto, ImWabaDto } from '@backoffice-monorepo/shared-types';

@Controller('im-wabas')
export class ImWabasController {
  constructor(private readonly imWabasService: ImWabasService) {}

  @Get()
  async findAll(): Promise<ImWabaDto[]> {
    return this.imWabasService.findAll();
  }

  @Post()
  async add(@Body() dto: AddImWabaDto): Promise<ImWabaDto> {
    return this.imWabasService.add(dto);
  }

  @Delete(':wabaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('wabaId') wabaId: string): Promise<void> {
    return this.imWabasService.remove(wabaId);
  }
}
