import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedirectsModule } from './redirects/redirects.module';
import { AccountEntity } from '../database/db-appchat/entities/account.entity';
import { ChatEntity } from '../database/db-appchat/entities/chat.entity';
import { SenderEntity } from '../database/db-appchat/entities/sender.entity';
import { TagEntity } from '../database/db-appchat/entities/tag.entity';
import { ChatTagEntity } from '../database/db-appchat/entities/chat-tag.entity';
import { Datasources } from '../common/datasources.enum';
import { VdiModule } from './vdi/vdi.module';
import { InstantMessengerModule } from './instant-messenger/instant-messenger.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/api/.env',
    }),

    MongooseModule.forRootAsync({
      connectionName: 'mongo_instant_messenger',
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_INSTANT_MESSENGER_URI'),
      }),
      inject: [ConfigService],
    }),

    TypeOrmModule.forRootAsync({
      name: Datasources.DB_APPCHAT,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_APPCHAT_HOST'),
        port: +configService.get<number>('DB_APPCHAT_PORT'),
        username: configService.get<string>('DB_APPCHAT_USERNAME'),
        password: configService.get<string>('DB_APPCHAT_PASSWORD'),
        database: configService.get<string>('DB_APPCHAT_DATABASE'),
        entities: [
          AccountEntity,
          ChatTagEntity,
          ChatEntity,
          SenderEntity,
          TagEntity,
        ],
        synchronize: false,
        ssl: true,
        extra: {
          ssl: {
            rejectUnauthorized: false,
          },
        },
      }),
      inject: [ConfigService],
    }),

    RedirectsModule,
    VdiModule,
    InstantMessengerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
