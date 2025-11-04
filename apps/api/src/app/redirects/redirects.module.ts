import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedirectsService } from './redirects.service';

import { RedirectsController } from './redirects.controller';
import { Datasources } from '../../common/datasources.enum';
import { ChatEntity } from '../../database/db-appchat/entities/chat.entity';
import { AccountEntity } from '../../database/db-appchat/entities/account.entity';
import { ChatTagEntity } from '../../database/db-appchat/entities/chat-tag.entity';
import { VdiModule } from '../vdi/vdi.module';
import { InstantMessengerModule } from '../instant-messenger/instant-messenger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [ChatEntity, ChatTagEntity, AccountEntity],
      Datasources.DB_APPCHAT
    ),
    VdiModule,
    InstantMessengerModule,
  ],
  controllers: [RedirectsController],
  providers: [RedirectsService],
})
export class RedirectsModule {}
