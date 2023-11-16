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

@Injectable()
export class LearningService {
  private readonly logger = new Logger(Learning.name);

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
        `Error fetching learnins for user ${userId} within ${from.toISOString()} - ${to.toISOString()}`,
      );
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
