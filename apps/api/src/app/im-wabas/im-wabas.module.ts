import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImWabaEntity } from '../../database/db-backoffice/entities/im-waba.entity';
import { Datasources } from '../../common/datasources.enum';
import { ImWabasService } from './im-wabas.service';
import { ImWabasController } from './im-wabas.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ImWabaEntity], Datasources.DB_BACKOFFICE),
  ],
  controllers: [ImWabasController],
  providers: [ImWabasService],
  exports: [ImWabasService],
})
export class ImWabasModule {}
