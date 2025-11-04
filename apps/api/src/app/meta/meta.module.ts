import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MetaService } from './meta.service';
import { MetaController } from './meta.controller';

@Module({
  imports: [HttpModule],
  controllers: [MetaController],
  providers: [MetaService],
  exports: [MetaService],
})
export class MetaModule {}
