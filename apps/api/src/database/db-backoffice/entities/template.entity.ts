import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WabaEntity } from './waba.entity';
import { TemplateAnalyticsEntity } from './template-analytics.entity';

@Entity('templates')
@Index(['wabaId', 'externalId'], { unique: true })
export class TemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'waba_id' })
  wabaId: string;

  @Column('text', { name: 'external_id' })
  externalId: string;

  @Column('text', { name: 'name' })
  name: string;

  @Column('text', { name: 'language' })
  language: string;

  @Column('text', { name: 'category', nullable: true })
  category: string | null;

  @Column('text', { name: 'status', nullable: true })
  status: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => WabaEntity, (waba) => waba.templates, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'waba_id' })
  waba: WabaEntity;

  @OneToMany(
    () => TemplateAnalyticsEntity,
    (templateAnalytics) => templateAnalytics.template
  )
  analytics?: TemplateAnalyticsEntity[];
}
