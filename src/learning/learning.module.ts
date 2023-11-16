import { Module } from '@nestjs/common';
import { LearningController } from './learning.controller';
import { LearningService } from './learning.service';
import { Learning } from './entities/learning.entity';
import { User } from '../auth/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([User, Learning])],
  controllers: [LearningController],
  providers: [LearningService],
})
export class LearningModule {}
