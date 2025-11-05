import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ArrayContains, Repository, LessThanOrEqual } from 'typeorm';
import { Datasources } from '../../common/datasources.enum';
import { ChatEntity } from '../../database/db-appchat/entities/chat.entity';
import { AccountEntity } from '../../database/db-appchat/entities/account.entity';
import { ChatTagEntity } from '../../database/db-appchat/entities/chat-tag.entity';
import { ScheduledRedirectEntity, RedirectStatus } from '../../database/db-redirects/entities/scheduled-redirect.entity';
import { 
  RedirectChatsDto, 
  CreateScheduledRedirectDto, 
  UpdateRedirectEndDateDto,
  RedirectListResponseDto 
} from '@backoffice-monorepo/shared-types';
import { VdiService } from '../vdi/vdi.service';
import { InstantMessengerService } from '../instant-messenger/instant-messenger.service';
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

    @InjectRepository(ScheduledRedirectEntity, Datasources.DB_REDIRECTS)
    private readonly scheduledRedirectRepository: Repository<ScheduledRedirectEntity>,

    private readonly vdiService: VdiService,
    private readonly instantMessengerService: InstantMessengerService
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

  async listAllRedirects(): Promise<RedirectListResponseDto[]> {
    const activeRedirects = await this.getActiveRedirects();
    const scheduledRedirects = await this.getScheduledRedirects();

    return [...activeRedirects, ...scheduledRedirects];
  }

  async createScheduledRedirect(
    dto: CreateScheduledRedirectDto
  ): Promise<ScheduledRedirectEntity> {
    const { sourceUserId, destinationUserId, sectorCode, startDate, endDate } = dto;

    const sourceUser = await this.vdiService.getUserById(sourceUserId);
    if (!sourceUser) {
      throw new NotFoundException(`Usuário de origem ${sourceUserId} não encontrado.`);
    }

    const destinationUser = await this.vdiService.getUserById(destinationUserId);
    if (!destinationUser) {
      throw new NotFoundException(`Usuário de destino ${destinationUserId} não encontrado.`);
    }

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;

    if (end && end <= start) {
      throw new BadRequestException('A data de fim deve ser maior que a data de início.');
    }

    const now = new Date();
    if (start < now) {
      throw new BadRequestException('A data de início não pode ser no passado.');
    }

    const scheduledRedirect = this.scheduledRedirectRepository.create({
      sourceUserId,
      destinationUserId,
      sectorCode,
      startDate: start,
      endDate: end,
      status: RedirectStatus.SCHEDULED,
    });

    return await this.scheduledRedirectRepository.save(scheduledRedirect);
  }

  async removeRedirect(redirectId: string, isScheduled: boolean): Promise<{ message: string }> {
    if (isScheduled) {
      const scheduledRedirect = await this.scheduledRedirectRepository.findOne({
        where: { id: redirectId },
      });

      if (!scheduledRedirect) {
        throw new NotFoundException(`Redirecionamento agendado ${redirectId} não encontrado.`);
      }

      scheduledRedirect.status = RedirectStatus.CANCELLED;
      await this.scheduledRedirectRepository.save(scheduledRedirect);

      return { message: 'Redirecionamento agendado cancelado com sucesso.' };
    } else {
      const parts = redirectId.split(':');
      if (parts.length !== 2) {
        throw new BadRequestException('ID de redirecionamento ativo inválido.');
      }

      const [sectorCode, destinationUserId] = parts;
      await this.removeActiveRedirect(sectorCode, destinationUserId);

      return { message: 'Redirecionamento ativo removido com sucesso.' };
    }
  }

  async updateRedirectEndDate(
    redirectId: string,
    dto: UpdateRedirectEndDateDto
  ): Promise<ScheduledRedirectEntity> {
    const scheduledRedirect = await this.scheduledRedirectRepository.findOne({
      where: { id: redirectId },
    });

    if (!scheduledRedirect) {
      throw new NotFoundException(`Redirecionamento agendado ${redirectId} não encontrado.`);
    }

    const newEndDate = new Date(dto.endDate);

    if (newEndDate <= scheduledRedirect.startDate) {
      throw new BadRequestException('A data de fim deve ser maior que a data de início.');
    }

    scheduledRedirect.endDate = newEndDate;
    return await this.scheduledRedirectRepository.save(scheduledRedirect);
  }

  async processScheduledRedirects(): Promise<void> {
    const now = new Date();

    const redirectsToActivate = await this.scheduledRedirectRepository.find({
      where: {
        status: RedirectStatus.SCHEDULED,
        startDate: LessThanOrEqual(now),
      },
    });

    for (const redirect of redirectsToActivate) {
      try {
        await this.activateScheduledRedirect(redirect);
        redirect.status = RedirectStatus.ACTIVE;
        await this.scheduledRedirectRepository.save(redirect);
        this.logger.log(`Redirecionamento ${redirect.id} ativado com sucesso.`);
      } catch (error) {
        this.logger.error(`Erro ao ativar redirecionamento ${redirect.id}:`, error);
      }
    }

    const redirectsToComplete = await this.scheduledRedirectRepository.find({
      where: {
        status: RedirectStatus.ACTIVE,
      },
    });

    for (const redirect of redirectsToComplete) {
      if (redirect.endDate && redirect.endDate <= now) {
        try {
          await this.deactivateRedirect(redirect);
          redirect.status = RedirectStatus.COMPLETED;
          await this.scheduledRedirectRepository.save(redirect);
          this.logger.log(`Redirecionamento ${redirect.id} finalizado com sucesso.`);
        } catch (error) {
          this.logger.error(`Erro ao finalizar redirecionamento ${redirect.id}:`, error);
        }
      }
    }
  }

  async getUserSectors(userId: string): Promise<{ code: string; name: string }[]> {
    const user = await this.vdiService.getUserById(userId);
    
    if (!user?.structs?.sectors) {
      return [];
    }

    return user.structs.sectors.map(sector => ({
      code: sector.code,
      name: sector.name,
    }));
  }

  private async getActiveRedirects(): Promise<RedirectListResponseDto[]> {
    const accounts = await this.accountEntityRepository.find();
    const activeRedirects: RedirectListResponseDto[] = [];

    for (const account of accounts) {
      if (!account.pool?.config?.overrides) {
        continue;
      }

      const overrides = account.pool.config.overrides;
      for (const [sectorCode, destinationUserId] of Object.entries(overrides)) {
        try {
          const destinationUser = await this.vdiService.getUserById(destinationUserId);
          
          activeRedirects.push({
            id: `${sectorCode}:${destinationUserId}`,
            status: 'active',
            sectorCode,
            sectorName: sectorCode,
            sourceUserId: '',
            sourceUserName: '',
            destinationUserId,
            destinationUserName: destinationUser?.name || destinationUserId,
            startDate: null,
            endDate: null,
          });
        } catch (error) {
          this.logger.warn(`Erro ao buscar usuário ${destinationUserId}:`, error);
        }
      }
    }

    return activeRedirects;
  }

  private async getScheduledRedirects(): Promise<RedirectListResponseDto[]> {
    const scheduledRedirects = await this.scheduledRedirectRepository.find({
      where: [
        { status: RedirectStatus.SCHEDULED },
        { status: RedirectStatus.ACTIVE },
      ],
    });

    const redirectList: RedirectListResponseDto[] = [];

    for (const redirect of scheduledRedirects) {
      try {
        const sourceUser = await this.vdiService.getUserById(redirect.sourceUserId);
        const destinationUser = await this.vdiService.getUserById(redirect.destinationUserId);

        redirectList.push({
          id: redirect.id,
          status: 'scheduled',
          sectorCode: redirect.sectorCode,
          sectorName: redirect.sectorCode,
          sourceUserId: redirect.sourceUserId,
          sourceUserName: sourceUser?.name || redirect.sourceUserId,
          destinationUserId: redirect.destinationUserId,
          destinationUserName: destinationUser?.name || redirect.destinationUserId,
          startDate: redirect.startDate,
          endDate: redirect.endDate,
        });
      } catch (error) {
        this.logger.warn(`Erro ao buscar dados do redirecionamento ${redirect.id}:`, error);
      }
    }

    return redirectList;
  }

  private async removeActiveRedirect(sectorCode: string, destinationUserId: string): Promise<void> {
    const sourceUser = await this.findUserBySectorCode(sectorCode);
    
    if (!sourceUser) {
      throw new NotFoundException(`Usuário com setor ${sectorCode} não encontrado.`);
    }

    const groupId = sourceUser.groups[0]?.id;
    if (!groupId) {
      throw new NotFoundException(`Usuário não possui grupo válido.`);
    }

    const account = await this.accountEntityRepository.findOne({
      where: {
        allowedGroups: ArrayContains([groupId]),
      },
    });

    if (!account?.pool?.config?.overrides) {
      throw new NotFoundException(`Conta não encontrada para o grupo ${groupId}.`);
    }

    if (account.pool.config.overrides[sectorCode] === destinationUserId) {
      delete account.pool.config.overrides[sectorCode];
      await this.accountEntityRepository.save(account);

      await this.chatEntityRepository
        .createQueryBuilder()
        .update(ChatEntity)
        .set({ userId: sourceUser.id })
        .where('userId = :destinationUserId', { destinationUserId })
        .andWhere(
          'id IN (SELECT c.id FROM chats c INNER JOIN contacts ct ON c.contact_id = ct.id WHERE ct.cs = :sectorCode)',
          { sectorCode }
        )
        .execute();
    } else {
      throw new NotFoundException(`Redirecionamento ativo não encontrado para o setor ${sectorCode}.`);
    }
  }

  private async activateScheduledRedirect(redirect: ScheduledRedirectEntity): Promise<void> {
    const sourceUser = await this.vdiService.getUserById(redirect.sourceUserId);
    const destinationUser = await this.vdiService.getUserById(redirect.destinationUserId);

    if (!sourceUser || !destinationUser) {
      throw new NotFoundException('Usuário de origem ou destino não encontrado.');
    }

    const groupId = sourceUser.groups[0]?.id;
    if (!groupId) {
      throw new NotFoundException('Usuário de origem não possui grupo válido.');
    }

    const account = await this.accountEntityRepository.findOne({
      where: {
        allowedGroups: ArrayContains([groupId]),
      },
    });

    if (!account?.pool?.config) {
      throw new NotFoundException(`Conta não encontrada para o grupo ${groupId}.`);
    }

    const userApplications = await this.instantMessengerService.getUserApplications(sourceUser.email);

    if (userApplications[0]?.id !== account.appId) {
      throw new NotFoundException(
        `Aplicação do usuário ${sourceUser.id} não compatível com a conta.`
      );
    }

    account.pool.config.overrides[redirect.sectorCode] = destinationUser.id;
    await this.accountEntityRepository.save(account);

    await this.chatTagEntityRepository.delete({
      chat: { userId: sourceUser.id },
    });

    await this.chatEntityRepository.update(
      { userId: sourceUser.id },
      { userId: destinationUser.id }
    );
  }

  private async deactivateRedirect(redirect: ScheduledRedirectEntity): Promise<void> {
    const sourceUser = await this.vdiService.getUserById(redirect.sourceUserId);
    
    if (!sourceUser) {
      throw new NotFoundException(`Usuário de origem ${redirect.sourceUserId} não encontrado.`);
    }

    const groupId = sourceUser.groups[0]?.id;
    if (!groupId) {
      throw new NotFoundException('Usuário de origem não possui grupo válido.');
    }

    const account = await this.accountEntityRepository.findOne({
      where: {
        allowedGroups: ArrayContains([groupId]),
      },
    });

    if (!account?.pool?.config?.overrides) {
      throw new NotFoundException(`Conta não encontrada para o grupo ${groupId}.`);
    }

    if (account.pool.config.overrides[redirect.sectorCode]) {
      delete account.pool.config.overrides[redirect.sectorCode];
      await this.accountEntityRepository.save(account);
    }

    await this.chatEntityRepository
      .createQueryBuilder()
      .update(ChatEntity)
      .set({ userId: sourceUser.id })
      .where('userId = :destinationUserId', { destinationUserId: redirect.destinationUserId })
      .andWhere(
        'id IN (SELECT c.id FROM chats c INNER JOIN contacts ct ON c.contact_id = ct.id WHERE ct.cs = :sectorCode)',
        { sectorCode: redirect.sectorCode }
      )
      .execute();
  }

  private async findUserBySectorCode(sectorCode: string): Promise<VdiUserResponseDto | null> {
    const users = await this.vdiService.getUsers({ perPage: 100 });
    
    for (const userData of users.data) {
      const user = await this.vdiService.getUserById(userData.id);
      if (user?.structs?.sectors?.some(sector => sector.code === sectorCode)) {
        return user;
      }
    }

    return null;
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

    const userApplications =
      await this.instantMessengerService.getUserApplications(sourceUser.email);

    if (userApplications[0].id !== account.appId) {
      throw new NotFoundException(
        `Aplicação do usuário ${sourceUser.id}, com conta com appId ${account.appId} não compatível com a aplicação ${userApplications[0].id} do Instant Messenger.`
      );
    }

    account.pool.config.overrides[sectorCode] = destinationUser.id;

    await this.accountEntityRepository.save(account);

    return {
      message: 'Redirecionamento dos chats futuros configurado.',
    };
  }
}
