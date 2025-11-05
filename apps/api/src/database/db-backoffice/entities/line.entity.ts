import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { WabaEntity } from './waba.entity';

@Entity('lines')
@Index(['externalSource', 'externalId'], { unique: true })
@Index(['normalizedPhoneNumber'])
export class LineEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { name: 'external_id' })
  externalId: string;

  @Column('text', { name: 'external_source', default: 'META' })
  externalSource: string;

  @Column('text', { name: 'normalized_phone_number', nullable: true })
  normalizedPhoneNumber: string;

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

  @ManyToOne(() => WabaEntity, (waba) => waba.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'waba_id' })
  waba: WabaEntity;
}
