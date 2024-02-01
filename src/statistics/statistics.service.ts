import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

interface LearningCountStatistics {
  date: Date;
  learningCount: number;
}

@Injectable()
export class StatisticsService {
  private readonly logger = new Logger(StatisticsService.name);

  constructor(private readonly dataSource: DataSource) {}

  async getLearningWeekStatistics(userId: string, toDate: Date): Promise<Array<LearningCountStatistics>> {
    try {
      const result = await this.dataSource.query('SELECT * FROM public.get_learning_counts_in_week($1, $2)', [
        userId,
        toDate,
      ]);

      if (result && typeof result === 'object' && Array.isArray(result)) {
        return result.map((row) => {
          if ('date' in row && 'count' in row) {
            return {
              date: new Date(row.date),
              learningCount: parseInt(row.count),
            };
          } else {
            throw new Error('Received invalid row');
          }
        });
      } else {
        throw new Error('Invalid result');
      }
    } catch (e: unknown) {
      this.logger.error(`Could not fetch week statistics for for user ${userId}`);
      throw e;
    }
  }
}
