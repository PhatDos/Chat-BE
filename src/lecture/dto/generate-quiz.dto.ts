import { IsNumber, IsOptional, Min, Max } from 'class-validator';

export class GenerateQuizDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(50)
  questionCount: number = 5;
}
