import { Test, TestingModule } from '@nestjs/testing';
import { AuthModule } from '../../auth/auth.module';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { TypeOrmConfigService } from '../../config/typeorm.config';
import { ConfigModule } from '@nestjs/config';
import { User } from '../../auth/entities/user.entity';
import { Repository } from 'typeorm';
import { validateConfig } from '../../config/config-validation';
import { LearningModule } from '../learning.module';
import supertest from 'supertest';
import { CreateLearningDto } from '../dto/create-learning.dto';
import { Learning } from '../entities/learning.entity';
import dayjs from 'dayjs';
import { UpdateLearningDto } from '../dto/update-learning.dto';

describe('Learning', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let learningRepository: Repository<Learning>;

  const testUserA = {
    email: 'A.user@test.com',
    password: 'This_is_val1d!',
    authToken: '',
  };

  const testUserB = {
    email: 'B.user@test.com',
    password: 'This_is_val1d!',
    authToken: '',
  };

  const learningEndpoint = '/learning';

  const clearUsedDbTables = async () => {
    await learningRepository.delete({});
    await userRepository.delete({});
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
        LearningModule,
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe()); // Needed to match application's dto validation.
    await app.init();

    userRepository = await module.get(getRepositoryToken(User));
    learningRepository = await module.get(getRepositoryToken(Learning));

    // Create test users.
    await supertest(app.getHttpServer()).post('/auth/register').send(testUserA);
    await supertest(app.getHttpServer()).post('/auth/register').send(testUserB);
    testUserA.authToken = (await supertest(app.getHttpServer()).post('/auth/login').send(testUserA)).body.authToken;
    testUserB.authToken = (await supertest(app.getHttpServer()).post('/auth/login').send(testUserB)).body.authToken;
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

  describe('POST /learning', () => {
    afterAll(async () => await learningRepository.delete({}));

    it('should create new learning given both title and description', async () => {
      const learningDto: CreateLearningDto = {
        title: 'Test learning 1',
        description: 'Test description 1',
      };
      await supertest(app.getHttpServer())
        .post(learningEndpoint)
        .auth(testUserA.authToken, { type: 'bearer' })
        .send(learningDto)
        .expect(HttpStatus.CREATED);
    });

    it('should not create new learning without title', async () => {
      const learningDto: CreateLearningDto = {
        title: '',
        description: 'this is optional',
      };
      await supertest(app.getHttpServer())
        .post(learningEndpoint)
        .auth(testUserA.authToken, { type: 'bearer' })
        .send(learningDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return forbidden for unauthorized requests', async () => {
      const learningDto: CreateLearningDto = {
        title: 'this is required',
        description: 'this is optional',
      };
      await supertest(app.getHttpServer()).post(learningEndpoint).send(learningDto).expect(HttpStatus.FORBIDDEN);
    });

    it('should create new learning with empty description', async () => {
      const learningDto: CreateLearningDto = {
        title: 'This is requierd',
        description: '',
      };
      await supertest(app.getHttpServer())
        .post(learningEndpoint)
        .auth(testUserA.authToken, { type: 'bearer' })
        .send(learningDto)
        .expect(HttpStatus.CREATED);
    });

    it('should not create new learning with title missing from request body', async () => {
      const learningDto: Omit<CreateLearningDto, 'title'> = {
        description: 'Title is missing',
      };
      await supertest(app.getHttpServer())
        .post(learningEndpoint)
        .auth(testUserA.authToken, { type: 'bearer' })
        .send(learningDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should not create new learning with description missing from request body', async () => {
      const learningDto: CreateLearningDto = {
        title: 'Description is missing',
      };
      await supertest(app.getHttpServer())
        .post(learningEndpoint)
        .auth(testUserA.authToken, { type: 'bearer' })
        .send(learningDto)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /learning/:id', () => {
    afterAll(async () => await learningRepository.delete({}));
    beforeAll(async () => {
      const userA = await userRepository.findOneByOrFail({ email: testUserA.email });
      const userB = await userRepository.findOneByOrFail({ email: testUserB.email });

      await learningRepository.insert([
        {
          title: 'user A learning 1',
          description: 'for /:id testing',
          owner: userA,
        },
        {
          title: 'user A learning 2',
          description: 'for /:id testing',
          owner: userA,
        },
      ]);

      await learningRepository.insert([
        {
          title: 'user B learning 1',
          description: 'for /:id testing',
          owner: userB,
        },
        {
          title: 'user B learning 2',
          description: 'for /:id testing',
          owner: userB,
        },
      ]);
    });

    it('should return forbidden for unauthorized requests', async () => {
      const learningId = (await learningRepository.findOneOrFail({ where: { owner: { email: testUserA.email } } })).id;
      await supertest(app.getHttpServer()).get(`${learningEndpoint}/${learningId}`).expect(HttpStatus.FORBIDDEN);
    });

    it('should return only the learning with specified id', async () => {
      const learningId = (await learningRepository.findOneOrFail({ where: { owner: { email: testUserA.email } } })).id;

      const { body } = await supertest(app.getHttpServer())
        .get(`${learningEndpoint}/${learningId}`)
        .auth(testUserA.authToken, { type: 'bearer' })
        .expect(HttpStatus.OK);

      expect(body.id).toBe(learningId);
    });

    it('should not return learnings of other users (IDOR protected)', async () => {
      const learningId = (await learningRepository.findOneOrFail({ where: { owner: { email: testUserA.email } } })).id;
      await supertest(app.getHttpServer())
        .get(`${learningEndpoint}/${learningId}`)
        .auth(testUserB.authToken, { type: 'bearer' })
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('GET /learning?from=<datetime>&to=<datetime>', () => {
    let userA: User;
    let userB: User;

    afterAll(async () => await learningRepository.delete({}));

    beforeAll(async () => {
      userA = await userRepository.findOneByOrFail({ email: testUserA.email });
      userB = await userRepository.findOneByOrFail({ email: testUserB.email });

      await learningRepository.insert([
        {
          title: 'user A learning 1',
          description: 'for daterange testing',
          createdAt: dayjs().subtract(2, 'day').startOf('day').toDate(),
          owner: userA,
        },
        {
          title: 'user A learning 2',
          description: 'for daterange testing',
          createdAt: dayjs().subtract(1, 'day').startOf('day').toDate(),
          owner: userA,
        },
        {
          title: 'user A learning 3',
          description: 'for daterange testing',
          createdAt: dayjs().startOf('day').toDate(),
          owner: userA,
        },
      ]);

      await learningRepository.insert([
        {
          title: 'user B learning 1',
          description: 'for daterange testing',
          createdAt: dayjs().subtract(2, 'day').startOf('day').toDate(),
          owner: userB,
        },
        {
          title: 'user B learning 2',
          description: 'for daterange testing',
          createdAt: dayjs().subtract(1, 'day').startOf('day').toDate(),
          owner: userB,
        },
        {
          title: 'user B learning 3',
          description: 'for daterange testing',
          createdAt: dayjs().startOf('day').toDate(),
          owner: userB,
        },
      ]);
    });

    it('should return forbidden for unauthorized requests', async () => {
      const from = dayjs().subtract(1, 'day').startOf('day').toISOString();
      const to = dayjs().endOf('day').toISOString();
      await supertest(app.getHttpServer())
        .get(`${learningEndpoint}?from=${from}&to=${to}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should return only the learnings created within given time range', async () => {
      const from = dayjs().subtract(1, 'day').startOf('day').toISOString();
      const to = dayjs().endOf('day').toISOString();

      const { body } = await supertest(app.getHttpServer())
        .get(`${learningEndpoint}?from=${from}&to=${to}`)
        .auth(testUserA.authToken, { type: 'bearer' })
        .expect(HttpStatus.OK);

      const expectedNumberOfLearningsWithinTimeeRange = 2;
      expect(body.length).toBe(expectedNumberOfLearningsWithinTimeeRange);
    });

    it('should return an empty array if no learnings are found for given range', async () => {
      const from = dayjs().subtract(10, 'day').startOf('day').toISOString();
      const to = dayjs().subtract(5, 'day').endOf('day').toISOString();

      const { body } = await supertest(app.getHttpServer())
        .get(`${learningEndpoint}?from=${from}&to=${to}`)
        .auth(testUserA.authToken, { type: 'bearer' })
        .expect(HttpStatus.OK);

      const expectedNumberOfLearningsWithinTimeeRange = 0;
      expect(body.length).toBe(expectedNumberOfLearningsWithinTimeeRange);
    });

    it('should not return learnings of other users (IDOR protected)', async () => {
      const from = dayjs().subtract(1, 'day').startOf('day').toISOString();
      const to = dayjs().endOf('day').toISOString();

      const { body } = await supertest(app.getHttpServer())
        .get(`${learningEndpoint}?from=${from}&to=${to}`)
        .auth(testUserA.authToken, { type: 'bearer' })
        .expect(HttpStatus.OK);

      expect((body as Array<{ ownerId: string }>).every((l) => l.ownerId === userA.id));
    });
  });

  describe('PUT /learning:id', () => {
    let userA: User;
    let userB: User;

    afterAll(async () => await learningRepository.delete({}));

    beforeAll(async () => {
      userA = await userRepository.findOneByOrFail({ email: testUserA.email });
      userB = await userRepository.findOneByOrFail({ email: testUserB.email });

      await learningRepository.insert([
        {
          title: 'user A learning 1',
          description: 'for put testing',
          owner: userA,
        },
        {
          title: 'user A learning 2',
          description: 'for put testing',
          owner: userA,
        },
      ]);

      await learningRepository.insert([
        {
          title: 'user B learning 1',
          description: 'for put testing',
          owner: userB,
        },
        {
          title: 'user B learning 2',
          description: 'for put testing',
          owner: userB,
        },
      ]);
    });

    it('should return forbidden for unauthorized requests', async () => {
      const learningId = (await learningRepository.findOneOrFail({ where: { owner: { email: testUserA.email } } })).id;
      await supertest(app.getHttpServer()).put(`${learningEndpoint}/${learningId}`).expect(HttpStatus.FORBIDDEN);
    });

    it('should update only the learning with specified id', async () => {
      const learningId = (await learningRepository.findOneOrFail({ where: { owner: { email: testUserA.email } } })).id;

      const updateDto: UpdateLearningDto = {
        id: learningId,
        title: 'updated title',
        description: 'updated description',
      };

      await supertest(app.getHttpServer())
        .put(`${learningEndpoint}/${learningId}`)
        .send(updateDto)
        .auth(testUserA.authToken, { type: 'bearer' })
        .expect(HttpStatus.NO_CONTENT);

      const updatedLearning = await learningRepository.findOneBy({ id: learningId });

      expect(updatedLearning).toMatchObject(updateDto);
    });

    it("should not allow deletion of other user's learnings (IDOR protected)", async () => {
      const learningId = (await learningRepository.findOneOrFail({ where: { owner: { email: testUserB.email } } })).id;

      const updateDto: UpdateLearningDto = {
        id: learningId,
        title: 'updated title',
        description: 'updated description',
      };

      await supertest(app.getHttpServer())
        .put(`${learningEndpoint}/${learningId}`)
        .send(updateDto)
        .auth(testUserA.authToken, { type: 'bearer' })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('DELETE /:id', () => {
    let userA: User;
    let userB: User;

    afterAll(async () => await learningRepository.delete({}));

    beforeAll(async () => {
      userA = await userRepository.findOneByOrFail({ email: testUserA.email });
      userB = await userRepository.findOneByOrFail({ email: testUserB.email });

      await learningRepository.insert([
        {
          title: 'user A learning 1',
          description: 'for delete testing',
          owner: userA,
        },
        {
          title: 'user A learning 2',
          description: 'for delete testing',
          owner: userA,
        },
      ]);

      await learningRepository.insert([
        {
          title: 'user B learning 1',
          description: 'for delete testing',
          owner: userB,
        },
        {
          title: 'user B learning 2',
          description: 'for delete testing',
          owner: userB,
        },
      ]);
    });

    it('should return forbidden for unauthorized requests', async () => {
      const learningId = (await learningRepository.findOneOrFail({ where: { owner: { email: testUserA.email } } })).id;
      await supertest(app.getHttpServer()).delete(`${learningEndpoint}/${learningId}`).expect(HttpStatus.FORBIDDEN);
    });

    it('should delete only the learning with specified id', async () => {
      const learningId = (await learningRepository.findOneOrFail({ where: { owner: { email: testUserA.email } } })).id;
      await supertest(app.getHttpServer())
        .delete(`${learningEndpoint}/${learningId}`)
        .auth(testUserA.authToken, { type: 'bearer' })
        .expect(HttpStatus.NO_CONTENT);

      const deletedLearning = await learningRepository.findOneBy({ id: learningId });
      expect(deletedLearning).toBeNull();
    });

    it("should not allow deletion of other user's learnings (IDOR protected)", async () => {
      const learningId = (await learningRepository.findOneOrFail({ where: { owner: { email: testUserB.email } } })).id;
      await supertest(app.getHttpServer())
        .delete(`${learningEndpoint}/${learningId}`)
        .auth(testUserA.authToken, { type: 'bearer' })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });
});
