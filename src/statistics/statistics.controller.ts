import { Controller, Get, Param, Req } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { AuthorizedRequest } from 'src/auth/types/auth.types';
import { LearningCountStatisticsDto } from './dto/LearningCountStatisticsDto';

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('/week/:to')
  async root(@Req() request: AuthorizedRequest, @Param('to') toDate: Date): Promise<LearningCountStatisticsDto> {
    const weekStatistics = await this.statisticsService.getLearningWeekStatistics(request.user.id, toDate);
    return { data: weekStatistics };
  }
}
