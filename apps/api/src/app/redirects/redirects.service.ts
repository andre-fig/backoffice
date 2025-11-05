import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ArrayContains, Repository } from 'typeorm';
import { Datasources } from '../../common/datasources.enum';
import { ChatEntity } from '../../database/db-appchat/entities/chat.entity';
import { AccountEntity } from '../../database/db-appchat/entities/account.entity';
import { ChatTagEntity } from '../../database/db-appchat/entities/chat-tag.entity';
import { RedirectChatsDto } from '@backoffice-monorepo/shared-types';
import { VdiService } from '../vdi/vdi.service';
import { VdiUserResponseDto } from '../vdi/dto/vdi-user-response.dto';

@Injectable()
export class RedirectsService {
  private readonly logger = new Logger(RedirectsService.name);

  constructor(
    @InjectRepository(AccountEntity, Datasources.DB_APPCHAT)
    private readonly accountEntityRepository: Repository<AccountEntity>,

    @InjectRepository(ChatEntity, Datasources.DB_APPCHAT)
    private readonly chatEntityRepository: Repository<ChatEntity>,

    @InjectRepository(ChatTagEntity, Datasources.DB_APPCHAT)
    private readonly chatTagEntityRepository: Repository<ChatTagEntity>,

    private readonly vdiService: VdiService
  ) {}

  async redirectUserChats(redirectChatsDto: RedirectChatsDto): Promise<{
    message: string;
  }> {
    const { sourceUserId, destinationUserId } = redirectChatsDto;

    const sourceUser = await this.vdiService.getUserById(sourceUserId);

    if (!sourceUser?.structs?.sectors?.length || !sourceUser?.groups?.length) {
      throw new NotFoundException(
        `Usuário ${sourceUserId} não possui setores ou grupos válidos.`
      );
    }

    const destinationUser = await this.vdiService.getUserById(
      destinationUserId
    );

    if (!destinationUser) {
      throw new NotFoundException(
        `Usuário de destino ${destinationUserId} não encontrado no VDI.`
      );
    }

    const sourceChatsExists = await this.chatEntityRepository.findOne({
      where: { userId: sourceUserId },
    });

    if (sourceChatsExists) {
      await this.redirectOldChats(sourceUser, destinationUser);
    } else {
      this.logger.warn(
        `Usuário de origem ${sourceUserId} não possui chats para redirecionar.`
      );
    }

    await this.redirectFutureChats(sourceUser, destinationUser);

    return {
      message: `Redirecionamento de chats de ${sourceUser.id} para ${destinationUser.id} concluído.`,
    };
  }

  async listUsers(options: {
    filter?: string;
    perPage?: number;
    direction?: string;
  }) {
    return await this.vdiService.getUsers({
      filter: options.filter,
      perPage: options.perPage,
      direction: options.direction,
    });
  }

  /**
   * Redireciona chats existentes.
   */
  private async redirectOldChats(
    sourceUser: VdiUserResponseDto,
    destinationUser: VdiUserResponseDto
  ): Promise<{ message: string }> {
    await this.chatTagEntityRepository.delete({
      chat: { userId: sourceUser.id },
    });

    const result = await this.chatEntityRepository.update(
      { userId: sourceUser.id },
      { userId: destinationUser.id }
    );

    return {
      message: `Redirecionamento dos chats existentes concluído. ${result.affected} chats atualizados.`,
    };
  }

  /**
   *  Redireciona chats futuros.
   */
  private async redirectFutureChats(
    sourceUser: VdiUserResponseDto,
    destinationUser: VdiUserResponseDto
  ): Promise<{ message: string }> {
    const groupId = sourceUser.groups[0].id;
    const sectorCode = sourceUser.structs.sectors[0].code;

    const account = await this.accountEntityRepository.findOne({
      where: {
        allowedGroups: ArrayContains([groupId]),
      },
    });

    if (!account?.pool?.config) {
      throw new NotFoundException(
        `Conta não encontrada com o grupo ${groupId}.`
      );
    }

    account.pool.config.overrides[sectorCode] = destinationUser.id;

    await this.accountEntityRepository.save(account);

    return {
      message: 'Redirecionamento dos chats futuros configurado.',
    };
  }
}
