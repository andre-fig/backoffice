import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ArrayContains, Repository } from 'typeorm';
import { Datasources } from '../../common/datasources.enum';
import { ChatEntity } from '../../database/db-appchat/entities/chat.entity';
import { AccountEntity } from '../../database/db-appchat/entities/account.entity';
import { ChatTagEntity } from '../../database/db-appchat/entities/chat-tag.entity';
import { RedirectChatsDto } from '@backoffice-monorepo/shared-types';
import { VdiService } from '../vdi/vdi.service';
import { InstantMessengerService } from '../instant-messenger/instant-messenger.service';

@Injectable()
export class RedirectsService {
  constructor(
    @InjectRepository(AccountEntity, Datasources.DB_APPCHAT)
    private readonly accountEntityRepository: Repository<AccountEntity>,

    @InjectRepository(ChatEntity, Datasources.DB_APPCHAT)
    private readonly chatEntityRepository: Repository<ChatEntity>,

    @InjectRepository(ChatTagEntity, Datasources.DB_APPCHAT)
    private readonly chatTagEntityRepository: Repository<ChatTagEntity>,

    private readonly vdiService: VdiService,
    private readonly instantMessengerService: InstantMessengerService
  ) {}

  async redirectUserChats(redirectChatsDto: RedirectChatsDto): Promise<{
    message: string;
  }> {
    const { userIdSaida, userIdDestino } = redirectChatsDto;

    const userSaidaExists = await this.accountEntityRepository.findOne({
      where: { id: userIdSaida },
    });

    if (!userSaidaExists) {
      throw new NotFoundException(
        `Usuário de saída ${userIdSaida} não encontrado.`
      );
    }

    const userDestinoExists = await this.accountEntityRepository.findOne({
      where: { id: userIdDestino },
    });

    if (!userDestinoExists) {
      throw new NotFoundException(
        `Usuário de destino ${userIdDestino} não encontrado.`
      );
    }

    await this.redirectOldChats(userIdSaida, userIdDestino);
    await this.redirectFutureChats(userIdSaida, userIdDestino);

    return {
      message: `Redirecionamento de chats de ${userIdSaida} para ${userIdDestino} concluído.`,
    };
  }

  /**
   * Redireciona chats existentes.
   */
  private async redirectOldChats(
    userIdSaida: string,
    userIdDestino: string
  ): Promise<{ message: string }> {
    await this.chatTagEntityRepository.delete({
      chat: { userId: userIdSaida },
    });

    const result = await this.chatEntityRepository.update(
      { userId: userIdSaida },
      { userId: userIdDestino }
    );

    return {
      message: `Redirecionamento dos chats existentes concluído. ${result.affected} chats atualizados.`,
    };
  }

  /**
   *  Redireciona chats futuros.
   */
  private async redirectFutureChats(
    userIdSaida: string,
    userIdDestino: string
  ): Promise<{ message: string }> {
    const user = await this.vdiService.getUserById(userIdSaida);

    const groupId = user.groups[0].id;

    const account = await this.accountEntityRepository.findOne({
      where: {
        allowedGroups: ArrayContains([groupId]),
      },
    });

    if (!account || !account.pool || !account.pool.config) {
      throw new NotFoundException(
        `Conta não encontrada com o grupo ${groupId}.`
      );
    }

    const userApplications =
      await this.instantMessengerService.getUserApplications(user.email);

    if (userApplications[0].id !== account.appId) {
      throw new NotFoundException(
        `Aplicação do usuário ${userIdSaida}, com conta com appId ${account.appId} não compatível com a aplicação ${userApplications[0].id} do Instant Messenger.`
      );
    }

    const sectorCode = user.structs.sectors[0].code;

    account.pool.config.overrides[sectorCode] = userIdDestino;

    await this.accountEntityRepository.save(account);

    return {
      message: 'Redirecionamento dos chats futuros configurado.',
    };
  }
}
