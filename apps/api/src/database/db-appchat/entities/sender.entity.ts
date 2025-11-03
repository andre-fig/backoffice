import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AccountEntity } from './account.entity';
import { ProviderType } from '../enums';

@Entity('senders')
export class SenderEntity {
  @PrimaryColumn('text')
  id: string;

  @Column('text', { name: 'account_id' })
  accountId: string;

  @Column('text', { name: 'sender_identifier' })
  senderIdentifier: string;

  @Column('enum', { enum: ProviderType, default: ProviderType.WHATSAPP })
  provider: ProviderType;

  @ManyToOne(() => AccountEntity, (account) => account.senders)
  @JoinColumn({ name: 'account_id' })
  account: AccountEntity;
}
