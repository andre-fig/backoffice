import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WabaEntity } from '../../database/db-backoffice/entities/waba.entity';
import { Datasources } from '../../common/datasources.enum';

@Injectable()
export class WabasService {
  constructor(
    @InjectRepository(WabaEntity, Datasources.DB_BACKOFFICE)
    private readonly wabaRepository: Repository<WabaEntity>
  ) {}

  async findAll(filter?: { isVisible?: boolean }): Promise<WabaEntity[]> {
    return await this.wabaRepository.find({
      where: filter,
      order: { isVisible: 'DESC', wabaName: 'ASC' },
    });
  }

  async findOne(wabaId: string): Promise<WabaEntity | null> {
    return await this.wabaRepository.findOne({
      where: { externalId: wabaId },
    });
  }

  async getAllWabaIds(): Promise<string[]> {
    const entities = await this.wabaRepository.find({
      select: ['externalId'],
    });
    return entities.map((entity) => entity.externalId);
  }

  async updateVisibility(wabaEntity: Partial<WabaEntity>): Promise<WabaEntity> {
    const entity = await this.wabaRepository.findOne({
      where: { id: wabaEntity.id },
    });

    if (!entity) {
      throw new NotFoundException(
        `WABA com ID ${wabaEntity.id} não encontrado`
      );
    }

    entity.isVisible = wabaEntity.isVisible;
    return await this.wabaRepository.save(entity);
  }
}
