import { Module } from '@nestjs/common';
import { InstantMessengerService } from './instant-messenger.service';

@Module({
  providers: [InstantMessengerService],
  exports: [InstantMessengerService],
})
export class InstantMessengerModule {}
