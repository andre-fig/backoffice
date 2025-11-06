import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { LineEntity } from './line.entity';

@Entity('wabas')
@Index(['externalId'], { unique: true })
export class WabaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { name: 'external_id' })
  externalId: string;

  @Column('text', { name: 'waba_name' })
  wabaName: string;

  @Column('boolean', { name: 'is_visible', default: false })
  isVisible: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => LineEntity, (line) => line.waba)
  lines: LineEntity[];
}
