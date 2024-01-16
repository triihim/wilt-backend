import { LearningDto } from './learning.dto';

export class LearningPageDto {
  learnings: Array<Omit<LearningDto, 'description'>>;
  totalCount: number;
}
