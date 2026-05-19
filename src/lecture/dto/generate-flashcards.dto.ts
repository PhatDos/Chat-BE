import { IsNumber, IsOptional, Min, Max } from 'class-validator';

export class GenerateFlashcardsDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(50)
  count: number = 10;
}
