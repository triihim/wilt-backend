import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Login {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  subject: string;

  @Column({ type: 'inet' })
  ip: string;

  @Column()
  success: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
