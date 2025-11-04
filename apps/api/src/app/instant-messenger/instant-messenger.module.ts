import { Module } from '@nestjs/common';
import { InstantMessengerService } from './instant-messenger.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [InstantMessengerService],
  exports: [InstantMessengerService],
})
export class InstantMessengerModule {}
