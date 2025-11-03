import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedirectsService } from './redirects.service';

import { RedirectsController } from './redirects.controller';
import { Datasources } from '../../common/datasources.enum';
import { ChatEntity } from '../../database/db-appchat/entities/chat.entity';
import { AccountEntity } from '../../database/db-appchat/entities/account.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [ChatEntity, AccountEntity],
      Datasources.DB_APPCHAT
    ),
  ],
  controllers: [RedirectsController],
  providers: [RedirectsService],
})
export class RedirectsModule {}
