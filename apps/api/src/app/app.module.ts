import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedirectsModule } from './redirects/redirects.module';
import { AccountEntity } from '../database/db-appchat/entities/account.entity';
import { ChatEntity } from '../database/db-appchat/entities/chat.entity';
import { SenderEntity } from '../database/db-appchat/entities/sender.entity';
import { TagEntity } from '../database/db-appchat/entities/tag.entity';
import { ChatTagEntity } from '../database/db-appchat/entities/chat-tag.entity';
import { ScheduledRedirectEntity } from '../database/db-backoffice/entities/scheduled-redirect.entity';
import { ImWabaEntity } from '../database/db-backoffice/entities/im-waba.entity';
import { MetaLineEntity } from '../database/db-backoffice/entities/meta-line.entity';
import { ConversationAnalyticsEntity } from '../database/db-backoffice/entities/conversation-analytics.entity';
import { Datasources } from '../common/datasources.enum';
import { VdiModule } from './vdi/vdi.module';
import { AuthModule } from './auth/auth.module';
import { MetaModule } from './meta/meta.module';
import { ImWabasModule } from './im-wabas/im-wabas.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/api/.env',
    }),

    ScheduleModule.forRoot(),

    CacheModule.register({
      isGlobal: true,
      ttl: 21600000,
      max: 1000,
    }),

    TypeOrmModule.forRootAsync({
      name: Datasources.DB_APPCHAT,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const useSsl =
          (configService.get<string>('DB_APPCHAT_SSL') ?? 'true')
            .toString()
            .toLowerCase() !== 'false';

        return {
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
          ssl: useSsl,
          ...(useSsl && {
            extra: {
              ssl: {
                rejectUnauthorized: false,
              },
            },
          }),
        };
      },
      inject: [ConfigService],
    }),

    TypeOrmModule.forRootAsync({
      name: Datasources.DB_BACKOFFICE,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const useSsl =
          (configService.get<string>('DB_BACKOFFICE_SSL') ?? 'true')
            .toString()
            .toLowerCase() !== 'false';

        return {
          type: 'postgres',
          host: configService.get<string>('DB_BACKOFFICE_HOST'),
          port: +configService.get<number>('DB_BACKOFFICE_PORT'),
          username: configService.get<string>('DB_BACKOFFICE_USERNAME'),
          password: configService.get<string>('DB_BACKOFFICE_PASSWORD'),
          database: configService.get<string>('DB_BACKOFFICE_DATABASE'),
          entities: [ScheduledRedirectEntity, ImWabaEntity, MetaLineEntity, ConversationAnalyticsEntity],
          synchronize: true,
          ssl: useSsl,
          ...(useSsl && {
            extra: {
              ssl: {
                rejectUnauthorized: false,
              },
            },
          }),
        };
      },
      inject: [ConfigService],
    }),

    RedirectsModule,
    VdiModule,
    AuthModule,
    MetaModule,
    ImWabasModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
