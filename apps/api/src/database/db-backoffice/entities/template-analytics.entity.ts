import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TemplateEntity } from './template.entity';

@Entity('template_analytics')
@Index(['templateId', 'date'], { unique: true })
export class TemplateAnalyticsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'template_id' })
  templateId: string;

  @Column('date', { name: 'date' })
  date: Date;

  @Column('text', { name: 'granularity', default: 'DAILY' })
  granularity: string;

  @Column('integer', { name: 'sent', default: 0 })
  sent: number;

  @Column('integer', { name: 'delivered', default: 0 })
  delivered: number;

  @Column('integer', { name: 'read', default: 0 })
  read: number;

  @Column('numeric', {
    name: 'cost_amount',
    precision: 12,
    scale: 6,
    default: 0,
  })
  costAmount: number;

  @Column('numeric', {
    name: 'cost_per_delivered',
    precision: 12,
    scale: 6,
    default: 0,
  })
  costPerDelivered: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => TemplateEntity, (template) => template.analytics, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template: TemplateEntity;
}
