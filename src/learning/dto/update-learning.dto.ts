import { IsDefined, Length, MaxLength } from 'class-validator';

export class UpdateLearningDto {
  @IsDefined()
  id: number;

  @Length(5, 200)
  title: string;

  @MaxLength(2000)
  description: string;
}
