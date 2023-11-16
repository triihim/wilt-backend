import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { compare } from 'bcrypt';
import { Learning } from '../../learning/entities/learning.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Learning, (learning) => learning.owner)
  learnings: Promise<Learning[]>;

  async validatePassword(plaintextPassword: string): Promise<boolean> {
    return compare(plaintextPassword, this.password);
  }
}
