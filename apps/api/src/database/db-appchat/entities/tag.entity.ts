import { Entity, PrimaryColumn, OneToMany } from 'typeorm';
import { ChatTagEntity } from './chat-tag.entity';

@Entity('tags')
export class TagEntity {
  @PrimaryColumn('text')
  id: string;

  @OneToMany(() => ChatTagEntity, (chatTag) => chatTag.tag)
  chats: ChatTagEntity[];
}
