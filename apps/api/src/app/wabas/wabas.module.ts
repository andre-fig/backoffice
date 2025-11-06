import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WabaEntity } from '../../database/db-backoffice/entities/waba.entity';
import { Datasources } from '../../common/datasources.enum';
import { WabasService } from './wabas.service';
import { WabasController } from './wabas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WabaEntity], Datasources.DB_BACKOFFICE)],
  controllers: [WabasController],
  providers: [WabasService],
  exports: [WabasService],
})
export class WabasModule {}
