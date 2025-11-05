import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WabaEntity } from '../../database/db-backoffice/entities/waba.entity';
import { Datasources } from '../../common/datasources.enum';
import { ImWabaDto, AddImWabaDto, UpdateImWabaVisibilityDto } from '@backoffice-monorepo/shared-types';

@Injectable()
export class ImWabasService {
  private readonly logger = new Logger(ImWabasService.name);

  constructor(
    @InjectRepository(WabaEntity, Datasources.DB_BACKOFFICE)
    private readonly imWabaRepository: Repository<WabaEntity>
  ) {}

  async findAll(): Promise<ImWabaDto[]> {
    const entities = await this.imWabaRepository.find({
      order: { createdAt: 'DESC' },
    });
    return entities.map((entity) => this.toDto(entity));
  }

  async findOne(wabaId: string): Promise<ImWabaDto | null> {
    const entity = await this.imWabaRepository.findOne({
      where: { externalId: wabaId, externalSource: 'META' },
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
      externalId: dto.wabaId,
      externalSource: 'META',
      wabaName: dto.wabaName,
    });

    const saved = await this.imWabaRepository.save(entity);
    this.logger.log(`WABA ${dto.wabaId} adicionado com sucesso`);
    return this.toDto(saved);
  }

  async remove(wabaId: string): Promise<void> {
    const entity = await this.imWabaRepository.findOne({
      where: { externalId: wabaId, externalSource: 'META' },
    });

    if (!entity) {
      throw new NotFoundException(`WABA com ID ${wabaId} não encontrado`);
    }

    await this.imWabaRepository.remove(entity);
    this.logger.log(`WABA ${wabaId} removido com sucesso`);
  }

  async getAllWabaIds(): Promise<string[]> {
    const entities = await this.imWabaRepository.find({
      where: { externalSource: 'META' },
      select: ['externalId'],
    });
    return entities.map((entity) => entity.externalId);
  }

  async updateVisibility(dto: UpdateImWabaVisibilityDto): Promise<ImWabaDto> {
    const entity = await this.imWabaRepository.findOne({
      where: { externalId: dto.wabaId, externalSource: 'META' },
    });

    if (!entity) {
      throw new NotFoundException(`WABA com ID ${dto.wabaId} não encontrado`);
    }

    entity.isVisible = dto.isVisible;
    const saved = await this.imWabaRepository.save(entity);
    this.logger.log(`WABA ${dto.wabaId} visibilidade atualizada para ${dto.isVisible}`);
    return this.toDto(saved);
  }

  async getVisibleWabas(): Promise<ImWabaDto[]> {
    const entities = await this.imWabaRepository.find({
      where: { isVisible: true },
      order: { createdAt: 'DESC' },
    });
    return entities.map((entity) => this.toDto(entity));
  }

  private toDto(entity: WabaEntity): ImWabaDto {
    return {
      wabaId: entity.externalId,
      wabaName: entity.wabaName,
      isVisible: entity.isVisible,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
