import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { LineEntity } from './line.entity';

@Entity('analytics')
@Index(['lineId', 'date', 'pricingCategory', 'pricingType'], {
  unique: true,
})
export class AnalyticsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'line_id' })
  lineId: string;

  @Column('date', { name: 'date' })
  date: Date;

  @Column('text', { name: 'pricing_category' })
  pricingCategory: string;

  @Column('text', { name: 'pricing_type' })
  pricingType: string;

  @Column('integer', { name: 'volume' })
  volume: number;

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
