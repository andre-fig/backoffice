import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('contacts')
export class ContactEntity {
  @PrimaryColumn('text')
  id: string;

  @Column('text', { name: 'cs' })
  cs: string;
}
