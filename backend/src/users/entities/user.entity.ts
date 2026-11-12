
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ type: 'text', nullable: true })
  fullName: string | null;

  @Column({ type: 'text', nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  gender: string | null;

  @Column({ type: 'text', nullable: true })
  birthDate: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  
  @Column({ type: 'text', nullable: true })
  resetPasswordToken: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  resetPasswordExpires: Date | null;

  @Column({ type: 'integer', default: 0 })
  loyaltyPoints: number;

  @CreateDateColumn()
  createdAt: Date;
}
