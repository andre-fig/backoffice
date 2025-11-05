import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('im_wabas')
export class ImWabaEntity {
  @PrimaryColumn('text', { name: 'waba_id' })
  wabaId: string;

  @Column('text', { name: 'waba_name' })
  wabaName: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
