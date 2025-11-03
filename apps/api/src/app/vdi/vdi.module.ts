import { Module } from '@nestjs/common';
import { VdiService } from './vdi.service';

@Module({
  providers: [VdiService],
  exports: [VdiService],
})
export class VdiModule {}
