import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

export enum RecordStatus {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

export enum ProcessingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('records')
@Index('idx_records_owner_created', ['owner', 'created_at'])
@Index('idx_records_processing_status', ['processing_status'])
@Index('idx_records_status', ['status'])
export class RecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.records, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 20, default: RecordStatus.NEW })
  status: RecordStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  file_key: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  file_url: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  file_name: string;

  @Column({ type: 'bigint', nullable: true })
  file_size: number;

  @Column({ type: 'varchar', length: 20, default: ProcessingStatus.PENDING })
  processing_status: ProcessingStatus;

  @Column({ type: 'text', nullable: true })
  processing_error: string;

  @Column({ type: 'jsonb', nullable: true })
  processing_metadata: any;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
