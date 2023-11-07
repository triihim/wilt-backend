import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Repository } from 'typeorm';
import { hash } from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async registerUser(email: string, plaintextPassword: string) {
    const passwordHash = await hash(plaintextPassword, 15);
    this.userRepository.create({ email, password: passwordHash });
  }
}
