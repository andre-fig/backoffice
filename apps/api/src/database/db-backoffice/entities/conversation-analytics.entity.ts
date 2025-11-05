import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { MetaLineEntity } from './meta-line.entity';

@Entity('conversation_analytics')
@Index(['lineId', 'date', 'conversationCategory', 'conversationDirection'], { unique: true })
export class ConversationAnalyticsEntity {
  @PrimaryColumn('text', { name: 'line_id' })
  lineId: string;

  @PrimaryColumn('date', { name: 'date' })
  date: Date;

  @PrimaryColumn('text', { name: 'conversation_category' })
  conversationCategory: string;

  @PrimaryColumn('text', { name: 'conversation_direction' })
  conversationDirection: string;

  @Column('integer', { name: 'conversation_count' })
  conversationCount: number;

  @Column('decimal', { precision: 10, scale: 2, name: 'cost' })
  cost: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => MetaLineEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'line_id' })
  line: MetaLineEntity;
}
