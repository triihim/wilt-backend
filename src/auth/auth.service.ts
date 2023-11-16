import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { hash } from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { RefreshToken } from './entities/refresh-token.entity';
import * as jwt from 'jsonwebtoken';
import { AuthTokenPayload, AuthTokenVerificationResult, AuthTokens } from './types/auth.types';
import ms from 'ms';
import { Login } from './entities/login';
import dayjs from 'dayjs';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly tokenSecret: string;
  private readonly authTokenExpiresIn: string;
  private readonly authTokenAlgorithm: jwt.Algorithm;
  private readonly passwordHashingSaltRounds: number;
  private readonly refreshTokenExpiresIn: string;
  private readonly allowedLoginAttempts: number;
  private readonly loginBlockDuration: string;

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken) private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(Login) private readonly loginRepository: Repository<Login>,
    private readonly configService: ConfigService,
  ) {
    this.tokenSecret = this.configService.getOrThrow<string>('TOKEN_SECRET');
    this.authTokenExpiresIn = this.configService.getOrThrow<string>('TOKEN_EXPIRES_IN');
    this.authTokenAlgorithm = this.configService.getOrThrow<jwt.Algorithm>('TOKEN_ALGORITHM');
    this.passwordHashingSaltRounds = this.configService.getOrThrow<number>('SALT_ROUNDS');
    this.refreshTokenExpiresIn = this.configService.getOrThrow<string>('REFRESH_TOKEN_EXPIRES_IN');
    this.allowedLoginAttempts = this.configService.getOrThrow<number>('ALLOWED_LOGIN_ATTEMPTS');
    this.loginBlockDuration = this.configService.getOrThrow<string>('LOGIN_BLOCK_DURATION');
  }

  async registerUser(email: string, plaintextPassword: string): Promise<void> {
    try {
      this.logger.log(`User registration with email: ${email}`);
      const passwordHash = await hash(plaintextPassword, this.passwordHashingSaltRounds);
      await this.userRepository.insert({ email, password: passwordHash });
    } catch (e: unknown) {
      this.logger.error('User registration failed');
      this.logger.error(e);
      throw e;
    }
  }

  async loginUser(email: string, plaintextPassword: string, clientIp: string): Promise<AuthTokens> {
    let wasLoginSuccessful = false;

    try {
      this.logger.log(`Login attempt with email: ${email} from ${clientIp}`);
      const isLoginBlocked = await this.isLoginBlocked(email, clientIp);

      if (isLoginBlocked) {
        throw new Error(`Login is blocked for: ${email}, ${clientIp}`);
      }

      const user = await this.userRepository.findOneOrFail({ where: { email } });
      const isCorrectPassword = await user.validatePassword(plaintextPassword);

      if (!isCorrectPassword) {
        this.logger.warn(`Invalid password submitted for user: ${email}`);
        throw new Error('invalid password');
      }

      const authToken = await this.createAuthToken(user);
      const refreshToken = await this.createRefreshToken(user);

      wasLoginSuccessful = true;
      return { authToken, refreshToken: refreshToken.id };
    } catch (e: unknown) {
      this.logger.error('Login failed');
      this.logger.error(e);
      throw e;
    } finally {
      await this.loginRepository.insert({ subject: email, ip: clientIp, success: wasLoginSuccessful });
    }
  }

  async refreshAuthToken(userId: string, tokens: AuthTokens): Promise<AuthTokens> {
    this.logger.log(`Token refresh requested by user ${userId}`);
    const verificationResult = this.verifyAuthToken(tokens.authToken);

    switch (verificationResult.status) {
      case 'valid':
        return tokens;
      case 'expired':
        return await this.maybeRefreshAuthToken(userId, tokens);
      case 'invalid':
      default:
        this.logger.log(`Could not refresh tokens for user ${userId}`);
        throw new Error('Could not refresh tokens');
    }
  }

  verifyAuthToken(token: string): AuthTokenVerificationResult {
    try {
      return { status: 'valid', payload: jwt.verify(token, this.tokenSecret) as AuthTokenPayload };
    } catch (e: unknown) {
      if (e instanceof jwt.TokenExpiredError) {
        return { status: 'expired', payload: jwt.decode(token) as AuthTokenPayload };
      }
    }
    return { status: 'invalid' };
  }

  private async isLoginBlocked(subject: string, ip: string): Promise<boolean> {
    // Frequent failed login attempts from a specific IP address lead to a login block.
    // Frequent failed login attempts to any subject (existing or non-existing user account) lead to a login block.
    const timeAtLoginBlockDurationAgo = dayjs().subtract(ms(this.loginBlockDuration), 'milliseconds').toDate();
    const failedLoginCount = await this.loginRepository
      .createQueryBuilder('login')
      .where('(login.subject = :subject OR login.ip = :ip)', { subject, ip })
      .andWhere('login.success = :success', { success: false })
      .andWhere('login.createdAt >= :loginAttemptsAfter', { loginAttemptsAfter: timeAtLoginBlockDurationAgo })
      .getCount();
    return failedLoginCount >= this.allowedLoginAttempts;
  }

  private async maybeRefreshAuthToken(userId: string, tokens: AuthTokens): Promise<AuthTokens> {
    const refreshToken = await this.refreshTokenRepository.findOneByOrFail({ id: tokens.refreshToken });
    const isRefreshTokenExpired = Date.now() - refreshToken.createdAt.getTime() > ms(this.refreshTokenExpiresIn);

    if (isRefreshTokenExpired) {
      throw new Error('Refresh token is expired');
    }

    const user = await this.userRepository.findOneByOrFail({ id: userId });
    const newAuthToken = await this.createAuthToken(user);
    return { ...tokens, authToken: newAuthToken };
  }

  private async createRefreshToken(user: User) {
    const existingRefreshToken = await this.refreshTokenRepository.findOne({ where: { user: { id: user.id } } });

    if (existingRefreshToken) {
      this.logger.log(`Replacing existing refresh token for user: ${user.id}`);
      this.refreshTokenRepository.delete(existingRefreshToken.id);
    }

    const refreshToken = await this.refreshTokenRepository.save({ user });
    return refreshToken;
  }

  private async createAuthToken(user: User) {
    const authToken = jwt.sign({ user: { email: user.email } }, this.tokenSecret, {
      expiresIn: this.authTokenExpiresIn,
      algorithm: this.authTokenAlgorithm,
      subject: user.id,
    });

    this.logger.log(`Created auth token for user: ${user.id}`);
    return authToken;
  }
}
