import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VdiModule } from './vdi/vdi.module';
import { AuthModule } from './auth/auth.module';
import { MetaModule } from './meta/meta.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/api/.env',
    }),

    CacheModule.register({
      isGlobal: true,
      ttl: 21600000,
      max: 1000,
    }),

    // MongooseModule.forRootAsync({
    //   connectionName: 'mongo_instant_messenger',
    //   imports: [ConfigModule],
    //   useFactory: (configService: ConfigService) => ({
    //     uri: configService.get<string>('MONGO_INSTANT_MESSENGER_URI'),
    //   }),
    //   inject: [ConfigService],
    // }),

    // TypeOrmModule.forRootAsync({
    //   name: Datasources.DB_APPCHAT,
    //   imports: [ConfigModule],
    //   useFactory: (configService: ConfigService) => ({
    //     type: 'postgres',
    //     host: configService.get<string>('DB_APPCHAT_HOST'),
    //     port: +configService.get<number>('DB_APPCHAT_PORT'),
    //     username: configService.get<string>('DB_APPCHAT_USERNAME'),
    //     password: configService.get<string>('DB_APPCHAT_PASSWORD'),
    //     database: configService.get<string>('DB_APPCHAT_DATABASE'),
    //     entities: [
    //       AccountEntity,
    //       ChatTagEntity,
    //       ChatEntity,
    //       SenderEntity,
    //       TagEntity,
    //     ],
    //     synchronize: false,
    //     ssl: true,
    //     extra: {
    //       ssl: {
    //         rejectUnauthorized: false,
    //       },
    //     },
    //   }),
    //   inject: [ConfigService],
    // }),

    // RedirectsModule,
    VdiModule,
    // InstantMessengerModule,
    AuthModule,
    MetaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
