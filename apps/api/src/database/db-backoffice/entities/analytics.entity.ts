import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { LineEntity } from './line.entity';

@Entity('analytics')
@Index(['lineId', 'date', 'conversationCategory', 'conversationDirection'], { unique: true })
export class AnalyticsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'line_id' })
  lineId: string;

  @Column('date', { name: 'date' })
  date: Date;

  @Column('text', { name: 'conversation_category' })
  conversationCategory: string;

  @Column('text', { name: 'conversation_direction' })
  conversationDirection: string;

  @Column('integer', { name: 'conversation_count' })
  conversationCount: number;

  @Column('decimal', { precision: 10, scale: 2, name: 'cost' })
  cost: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => LineEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'line_id' })
  line: LineEntity;
}
