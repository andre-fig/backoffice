import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { SenderEntity } from './sender.entity';
import { AccountType } from '../enums';

@Entity('accounts')
export class AccountEntity {
  @PrimaryColumn('text')
  id: string;

  @Column('text', { name: 'app_id' })
  appId: string;

  @Column('text', {
    name: 'allowed_groups',
    array: true,
    nullable: true,
    default: () => 'ARRAY[]::text[]',
  })
  allowedGroups: string[];

  @Column('text', { name: 'chat_closed_context' })
  chatClosedContext: string;

  @Column('text', { name: 'chat_open_context' })
  chatOpenContext: string;

  @Column('jsonb')
  pool: {
    config: {
      overrides: { [key: string]: string };
    };
  };

  @Column('int', { name: 'session_timeout', default: 600 })
  sessionTimeout: number;

  @Column('enum', { enum: AccountType, default: AccountType.RESELLER })
  type: AccountType;

  @Column('text', {
    array: true,
    nullable: true,
    name: 'copilots',
    default: () => '\'ARRAY[]::"CopilotType"[]\'',
  })
  copilotTypes: string[];

  @OneToMany(() => SenderEntity, (sender) => sender.account)
  senders: SenderEntity[];
}
