import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Learning } from './entities/learning.entity';
import { User } from '../auth/entities/user.entity';

interface ILearning {
  id: number;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
}

interface ILearningPage {
  learnings: Array<Omit<ILearning, 'description'>>;
  totalCount: number;
}

type PageRequest<T> = {
  page: number;
  pageSize: number;
  filter: {
    [K in keyof T]?: string;
  };
};

@Injectable()
export class LearningService {
  private readonly logger = new Logger(LearningService.name);

  constructor(
    @InjectRepository(Learning) private readonly learningRepository: Repository<Learning>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async create(userId: string, title: string, description: string = ''): Promise<ILearning> {
    try {
      this.logger.log(`Creating new learning for user ${userId}`);
      const user = await this.userRepository.findOneOrFail({ where: { id: userId } });

      const newLearning = await this.learningRepository.save({
        title,
        description,
        owner: user,
      });

      this.logger.log(`Learning ${newLearning.id} created successfully for user ${userId}`);

      return {
        id: newLearning.id,
        title: newLearning.title,
        description: newLearning.description,
        createdAt: newLearning.createdAt,
        updatedAt: newLearning.updatedAt,
        ownerId: userId,
      };
    } catch (e: unknown) {
      this.logger.error('Learning creation failed');
      this.logger.error(e);
      throw e;
    }
  }

  async findOne(userId: string, learningId: number) {
    try {
      return await this.learningRepository.findOneOrFail({
        where: { id: learningId, owner: { id: userId } },
      });
    } catch (e: unknown) {
      this.logger.error(`Could not find a learning with id ${learningId} for user ${userId}`);
      throw e;
    }
  }

  async findInDateRange(userId: string, from: Date, to: Date): Promise<ILearning[]> {
    try {
      const learnings = await this.learningRepository
        .createQueryBuilder('learning')
        .where('learning."ownerId" = :userId', { userId })
        .andWhere('learning."createdAt" >= :from', { from })
        .andWhere('learning."createdAt" < :to', { to })
        .orderBy('learning."createdAt"', 'DESC')
        .getMany();

      return learnings.map((l) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        ownerId: userId,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
      }));
    } catch (e: unknown) {
      this.logger.error(
        `Error fetching learnings for user ${userId} within ${from.toISOString()} - ${to.toISOString()}`,
      );
      throw e;
    }
  }

  async findInPage(userId: string, pageRequest: PageRequest<ILearning>): Promise<ILearningPage> {
    const { page, pageSize, filter } = pageRequest;
    try {
      // TODO: Hard coded config values to env.
      if (page < 0) throw new Error('invalid page number');
      if (pageSize > 50) throw new Error('invalid page size');

      const [learnings, learningCountOfUser] = await this.learningRepository
        .createQueryBuilder('learning')
        .where('learning."ownerId" = :userId', { userId })
        .andWhere('learning."title" ilike :titleFilter', { titleFilter: `%${filter.title}%` })
        .orderBy('learning."createdAt"', 'DESC')
        .skip(page * pageSize)
        .take(pageSize)
        .getManyAndCount();

      return {
        learnings: learnings.map((l) => ({
          id: l.id,
          title: l.title,
          description: l.description,
          ownerId: userId,
          createdAt: l.createdAt,
          updatedAt: l.updatedAt,
        })),
        totalCount: learningCountOfUser,
      };
    } catch (e: unknown) {
      this.logger.error(`Error fetching learnings for user ${userId}`);
      throw e;
    }
  }

  async updateOne(userId: string, learningId: number, values: Pick<ILearning, 'title' | 'description'>) {
    try {
      const result = await this.learningRepository
        .createQueryBuilder('learning')
        .update({ title: values.title, description: values.description })
        .where('learning."ownerId" = :userId', { userId })
        .andWhere('learning.id = :learningId', { learningId })
        .execute();

      if (result.affected === 0) {
        throw new Error();
      }
    } catch (e: unknown) {
      this.logger.error(`Could not update a learning with id ${learningId} for user ${userId}`);
      throw e;
    }
  }

  async deleteOne(userId: string, learningId: number) {
    try {
      const result = await this.learningRepository
        .createQueryBuilder('learning')
        .delete()
        .where('learning."ownerId" = :userId', { userId })
        .andWhere('learning.id = :learningId', { learningId })
        .execute();

      if (result.affected === 0) {
        throw new Error();
      }
    } catch (e: unknown) {
      this.logger.error(`Could not delete a learning with id ${learningId} for user ${userId}`);
      throw e;
    }
  }
}
