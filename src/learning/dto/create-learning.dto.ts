import { Length, MaxLength } from 'class-validator';

export class CreateLearningDto {
  @Length(5, 150)
  title: string;

  @MaxLength(2000)
  description?: string;
}
