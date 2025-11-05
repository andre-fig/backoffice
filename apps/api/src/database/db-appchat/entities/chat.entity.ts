import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { ChatTagEntity } from './chat-tag.entity';

@Entity('chats')
export class ChatEntity {
  @PrimaryColumn('text')
  id: string;

  @Column('text', { name: 'user_id' })
  userId: string;

  @Column('text', { name: 'contact_id' })
  contactId: string;

  @OneToMany(() => ChatTagEntity, (chatTag) => chatTag.chat)
  tags: ChatTagEntity[];
}
