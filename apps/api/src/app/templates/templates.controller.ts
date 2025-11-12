import { Controller, Get, Param, Query } from '@nestjs/common';
import { TemplatesService } from './templates.service';

@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  async listTemplates(@Query('wabaId') wabaExternalId?: string) {
    return this.templatesService.listTemplates(wabaExternalId);
  }

  @Get(':templateId/analytics')
  async getTemplateAnalytics(
    @Param('templateId') templateId: string,
    @Query('start') start?: string,
    @Query('end') end?: string
  ) {
    return this.templatesService.getTemplateAnalytics(templateId, start, end);
  }
}
