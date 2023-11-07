import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { compare } from 'bcrypt';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  async validatePassword(password: string): Promise<boolean> {
    return compare(password, this.password);
  }
}
