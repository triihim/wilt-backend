import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { hash } from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { RefreshToken } from './entities/refresh-token.entity';
import * as jwt from 'jsonwebtoken';
import { AuthTokens } from './types/auth.types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly configService: ConfigService,
  ) {}

  async registerUser(email: string, plaintextPassword: string): Promise<void> {
    try {
      this.logger.log(`User registration with email: ${email}`);
      const saltRounds = 12; // TODO: Get from env
      const passwordHash = await hash(plaintextPassword, saltRounds);
      await this.userRepository.insert({
        email,
        password: passwordHash,
      });
    } catch (e: unknown) {
      this.logger.error('User registration failed', e);
      throw e;
    }
  }

  async loginUser(
    email: string,
    plaintextPassword: string,
  ): Promise<AuthTokens> {
    try {
      this.logger.log(`Login attempt with email: ${email}`);
      const user = await this.userRepository.findOneOrFail({
        where: { email },
      });

      const isCorrectPassword = await user.validatePassword(plaintextPassword);

      if (!isCorrectPassword) {
        this.logger.warn(`Invalid password submitted for user: ${email}`);
        throw new Error('invalid password');
      }

      const tokens = await this.createAuthTokens(user);
      return tokens;
    } catch (e: unknown) {
      this.logger.error('Login failed', e);
      throw e;
    }
  }

  private async createAuthTokens(user: User) {
    const tokenSecret = this.configService.get<string>('TOKEN_SECRET');
    const tokenExpiresIn = this.configService.get<string>('TOKEN_EXPIRES_IN');
    const tokenAlgorithm =
      this.configService.get<jwt.Algorithm>('TOKEN_ALGORITHM');

    if (!tokenSecret) {
      throw new Error('Missing jwt secret');
    }

    if (!tokenExpiresIn) {
      throw new Error('Missing jwt expiration');
    }

    if (!tokenAlgorithm) {
      throw new Error('Missing jwt algorithm');
    }

    const existingRefreshToken = await this.refreshTokenRepository.findOne({
      where: { user: { id: user.id } },
    });

    if (existingRefreshToken) {
      this.logger.log(`Replacing existing refresh token for user: ${user.id}`);
      this.refreshTokenRepository.delete(existingRefreshToken.id);
    }

    const refreshToken = await this.refreshTokenRepository.save({ user });

    const authToken = jwt.sign({ user: { email: user.email } }, tokenSecret, {
      expiresIn: tokenExpiresIn,
      algorithm: tokenAlgorithm,
      subject: user.id,
    });

    this.logger.log(`Created auth token for user: ${user.id}`);
    return { refreshToken: refreshToken.id, authToken };
  }
}
