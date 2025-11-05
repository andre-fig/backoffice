import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ImWabaEntity } from './im-waba.entity';

@Entity('meta_lines')
export class MetaLineEntity {
  @PrimaryColumn('text', { name: 'line_id' })
  lineId: string;

  @Column('text', { name: 'waba_id' })
  wabaId: string;

  @Column('text', { name: 'display_phone_number', nullable: true })
  displayPhoneNumber: string;

  @Column('text', { name: 'verified_name', nullable: true })
  verifiedName: string;

  @Column('text', { name: 'name_status', nullable: true })
  nameStatus: string;

  @Column('text', { name: 'status', nullable: true })
  status: string;

  @Column('text', { name: 'quality_rating', nullable: true })
  qualityRating: string;

  @Column('boolean', { name: 'is_official_business_account', default: false })
  isOfficialBusinessAccount: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => ImWabaEntity, (waba) => waba.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'waba_id' })
  waba: ImWabaEntity;
}
