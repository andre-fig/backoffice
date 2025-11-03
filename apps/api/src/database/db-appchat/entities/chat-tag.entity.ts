import {
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  CreateDateColumn,
} from 'typeorm';
import { ChatEntity } from './chat.entity';
import { TagEntity } from './tag.entity';

@Entity('chats_tags')
export class ChatTagEntity {
  @PrimaryColumn('text', { name: 'chat_id' })
  chatId: string;

  @PrimaryColumn('text', { name: 'tag_id' })
  tagId: string;

  @CreateDateColumn({ type: 'timestamp without time zone', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => ChatEntity, (chat) => chat.tags)
  @JoinColumn({ name: 'chat_id' })
  chat: ChatEntity;

  @ManyToOne(() => TagEntity, (tag) => tag.chats)
  @JoinColumn({ name: 'tag_id' })
  tag: TagEntity;
}
