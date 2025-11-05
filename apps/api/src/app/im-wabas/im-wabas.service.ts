import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImWabaEntity } from '../../database/db-backoffice/entities/im-waba.entity';
import { Datasources } from '../../common/datasources.enum';
import { ImWabaDto, AddImWabaDto } from '@backoffice-monorepo/shared-types';

@Injectable()
export class ImWabasService {
  private readonly logger = new Logger(ImWabasService.name);

  constructor(
    @InjectRepository(ImWabaEntity, Datasources.DB_BACKOFFICE)
    private readonly imWabaRepository: Repository<ImWabaEntity>
  ) {}

  async findAll(): Promise<ImWabaDto[]> {
    const entities = await this.imWabaRepository.find({
      order: { createdAt: 'DESC' },
    });
    return entities.map((entity) => this.toDto(entity));
  }

  async findOne(wabaId: string): Promise<ImWabaDto | null> {
    const entity = await this.imWabaRepository.findOne({
      where: { wabaId },
    });
    return entity ? this.toDto(entity) : null;
  }

  async add(dto: AddImWabaDto): Promise<ImWabaDto> {
    const existing = await this.findOne(dto.wabaId);
    if (existing) {
      throw new ConflictException(
        `WABA com ID ${dto.wabaId} já está cadastrado`
      );
    }

    const entity = this.imWabaRepository.create({
      wabaId: dto.wabaId,
      wabaName: dto.wabaName,
    });

    const saved = await this.imWabaRepository.save(entity);
    this.logger.log(`WABA ${dto.wabaId} adicionado com sucesso`);
    return this.toDto(saved);
  }

  async remove(wabaId: string): Promise<void> {
    const entity = await this.imWabaRepository.findOne({
      where: { wabaId },
    });

    if (!entity) {
      throw new NotFoundException(`WABA com ID ${wabaId} não encontrado`);
    }

    await this.imWabaRepository.remove(entity);
    this.logger.log(`WABA ${wabaId} removido com sucesso`);
  }

  async getAllWabaIds(): Promise<string[]> {
    const entities = await this.imWabaRepository.find({
      select: ['wabaId'],
    });
    return entities.map((entity) => entity.wabaId);
  }

  private toDto(entity: ImWabaEntity): ImWabaDto {
    return {
      wabaId: entity.wabaId,
      wabaName: entity.wabaName,
      createdAt: entity.createdAt,
    };
  }
}
