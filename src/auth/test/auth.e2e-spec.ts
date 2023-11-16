import { Test, TestingModule } from '@nestjs/testing';
import { AuthModule } from '../auth.module';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { TypeOrmConfigService } from '../../config/typeorm.config';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import supertest from 'supertest';
import { AuthTokenDto } from '../dto/auth-token.dto';
import * as jwt from 'jsonwebtoken';
import ms from 'ms';
import { validateConfig } from '../../config/config-validation';
import { Login } from '../entities/login';

describe('Authentication', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let refreshTokenRepository: Repository<RefreshToken>;
  let loginRepository: Repository<Login>;
  let configService: ConfigService;
  let tokenSecret: string;

  const clearUsedDbTables = async () => {
    await refreshTokenRepository.delete({});
    await userRepository.delete({});
    await loginRepository.delete({});
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: `./env/test.env`,
          validate: validateConfig,
        }),
        TypeOrmModule.forRootAsync({
          useClass: TypeOrmConfigService,
        }),
        AuthModule,
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe()); // Needed to match application's dto validation.
    await app.init();

    userRepository = await module.get(getRepositoryToken(User));
    refreshTokenRepository = await module.get(getRepositoryToken(RefreshToken));
    loginRepository = await module.get(getRepositoryToken(Login));
    configService = await module.get(ConfigService);
    tokenSecret = configService.getOrThrow<string>('TOKEN_SECRET');
  });

  afterAll(async () => {
    try {
      await clearUsedDbTables();
    } catch (e: unknown) {
      console.error(e);
    } finally {
      await app.close();
    }
  });

  const userEmail = 'test@email.com';
  const validPassword = 'Str0ngPassword!';
  const invalidPassword = 'weakPass1';

  const registrationEndpoint = '/auth/register';
  const registrationDto = { email: userEmail, password: validPassword };

  const loginEndpoint = '/auth/login';
  const loginDto = { email: userEmail, password: validPassword };

  const refreshTokenEndpoint = '/auth/refresh-token';

  describe('POST /auth/register', () => {
    afterAll(async () => {
      await clearUsedDbTables();
    });

    it('should create a new user', async () => {
      await supertest(app.getHttpServer()).post(registrationEndpoint).send(registrationDto).expect(HttpStatus.CREATED);
      expect(await userRepository.count({ where: { email: userEmail } })).toBe(1);
    });

    it('should not allow registration with already registered email', async () => {
      await supertest(app.getHttpServer())
        .post(registrationEndpoint)
        .send(registrationDto)
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(await userRepository.count({ where: { email: userEmail } })).toBe(1);
    });

    it('should not allow registration with weak password', async () => {
      await supertest(app.getHttpServer())
        .post(registrationEndpoint)
        .send({ ...registrationDto, password: invalidPassword })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await supertest(app.getHttpServer()).post(registrationEndpoint).send(registrationDto).expect(HttpStatus.CREATED);
    });

    afterEach(async () => {
      await clearUsedDbTables();
    });

    it('should return valid auth token for valid user credentials and create refresh token', async () => {
      const { authToken, refreshToken } = (
        await supertest(app.getHttpServer()).post(loginEndpoint).send(loginDto).expect(HttpStatus.OK)
      ).body as AuthTokenDto;

      expect(() => jwt.verify(authToken, tokenSecret)).not.toThrow();
      expect(await refreshTokenRepository.exist({ where: { id: refreshToken } })).toBe(true);
    });

    it('should not return auth token for invalid user credentials', async () => {
      await supertest(app.getHttpServer())
        .post(loginEndpoint)
        .send({ ...loginDto, password: invalidPassword })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should block login for a period of time after failed attempts', async () => {
      const loginBlockDuration = configService.getOrThrow<string>('LOGIN_BLOCK_DURATION');
      let loginAttempts = configService.getOrThrow<number>('ALLOWED_LOGIN_ATTEMPTS');

      while (loginAttempts--) {
        // Exhaust the login attempts with invalid credentials.
        await supertest(app.getHttpServer())
          .post(loginEndpoint)
          .send({ ...loginDto, password: invalidPassword });
      }

      // Expect to be blocked even for valid credentials.
      await supertest(app.getHttpServer())
        .post(loginEndpoint)
        .send({ ...loginDto, password: validPassword })
        .expect(HttpStatus.FORBIDDEN);

      await new Promise((resolve) => setTimeout(resolve, ms(loginBlockDuration)));

      // Expect the block to lift after configured time.
      await supertest(app.getHttpServer())
        .post(loginEndpoint)
        .send({ ...loginDto, password: validPassword })
        .expect(HttpStatus.OK);
    });
  });

  describe('POST /auth/refresh-token', () => {
    beforeAll(async () => {
      await supertest(app.getHttpServer()).post(registrationEndpoint).send(registrationDto).expect(HttpStatus.CREATED);
    });

    afterAll(async () => {
      await clearUsedDbTables();
    });

    afterEach(async () => {
      await refreshTokenRepository.delete({});
    });

    it('should not refresh still valid auth token', async () => {
      const authToken = jwt.sign({ user: { email: userEmail } }, tokenSecret);
      const authTokenDto: AuthTokenDto = { authToken: authToken, refreshToken: 'not used in this scenario' };
      await supertest(app.getHttpServer())
        .post(refreshTokenEndpoint)
        .auth(authToken, { type: 'bearer' })
        .send(authTokenDto)
        .expect(HttpStatus.OK, authTokenDto);
    });

    it('should return new auth token in exchange for expired one given valid refresh token', async () => {
      const user = await userRepository.findOne({ where: { email: userEmail } });

      const validRefreshToken = await refreshTokenRepository.save({ user: user! });
      const expiredAuthToken = jwt.sign({ user: { email: userEmail } }, tokenSecret, { expiresIn: 0 });

      const authTokenDto: AuthTokenDto = { authToken: expiredAuthToken, refreshToken: validRefreshToken.id };
      const refreshedTokens = (
        await supertest(app.getHttpServer())
          .post(refreshTokenEndpoint)
          .auth(expiredAuthToken, { type: 'bearer' })
          .send(authTokenDto)
          .expect(HttpStatus.OK)
      ).body as AuthTokenDto;

      expect(refreshedTokens.authToken).not.toBe(expiredAuthToken);
      expect(() => jwt.verify(refreshedTokens.authToken, tokenSecret)).not.toThrow();
    });

    it('should not return new tokens if refresh token is expired', async () => {
      const refreshTokenExpiresIn = configService.getOrThrow<string>('REFRESH_TOKEN_EXPIRES_IN')!;
      const user = await userRepository.findOne({ where: { email: userEmail } });

      const expiredRefreshToken = await refreshTokenRepository.save({
        user: user!,
        createdAt: new Date(Date.now() - ms(refreshTokenExpiresIn) - 1000),
      });

      const expiredAuthToken = jwt.sign({ user: { email: userEmail } }, tokenSecret, { expiresIn: 0 });

      const authTokenDto: AuthTokenDto = { authToken: expiredAuthToken, refreshToken: expiredRefreshToken.id };

      await supertest(app.getHttpServer())
        .post(refreshTokenEndpoint)
        .auth(expiredAuthToken, { type: 'bearer' })
        .send(authTokenDto)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should not return new tokens if refresh token does not exist', async () => {
      const expiredAuthToken = jwt.sign({ user: { email: userEmail } }, tokenSecret, { expiresIn: 0 });
      const authTokenDto: AuthTokenDto = { authToken: expiredAuthToken, refreshToken: 'does not exist' };

      await supertest(app.getHttpServer())
        .post(refreshTokenEndpoint)
        .auth(expiredAuthToken, { type: 'bearer' })
        .send(authTokenDto)
        .expect(HttpStatus.FORBIDDEN);
    });
  });
});
