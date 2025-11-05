import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum RedirectStatus {
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('scheduled_redirects')
export class ScheduledRedirectEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { name: 'source_user_id' })
  sourceUserId: string;

  @Column('text', { name: 'destination_user_id' })
  destinationUserId: string;

  @Column('text', { name: 'sector_code' })
  sectorCode: string;

  @Column('timestamp', { name: 'start_date' })
  startDate: Date;

  @Column('timestamp', { name: 'end_date', nullable: true })
  endDate: Date | null;

  @Column({
    type: 'enum',
    enum: RedirectStatus,
    default: RedirectStatus.SCHEDULED,
  })
  status: RedirectStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
