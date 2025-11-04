import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { VdiService } from './vdi.service';
import { VdiController } from './vdi.controller';
import { AuthService } from '../auth/auth.service';

@Module({
  imports: [HttpModule],
  providers: [VdiService, AuthService],
  controllers: [VdiController],
  exports: [VdiService],
})
export class VdiModule {}
