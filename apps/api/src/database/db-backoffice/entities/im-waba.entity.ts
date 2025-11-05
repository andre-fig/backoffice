import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { MetaLineEntity } from './meta-line.entity';

@Entity('im_wabas')
export class ImWabaEntity {
  @PrimaryColumn('text', { name: 'waba_id' })
  wabaId: string;

  @Column('text', { name: 'waba_name' })
  wabaName: string;

  @Column('boolean', { name: 'is_visible', default: false })
  isVisible: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => MetaLineEntity, (line) => line.waba)
  lines: MetaLineEntity[];
}
