import { IsEnum, IsOptional } from 'class-validator';
import { SummaryTone } from '~/generated/prisma';

export class GenerateSummaryDto {
  @IsEnum(SummaryTone)
  @IsOptional()
  tone: SummaryTone = SummaryTone.CONCISE;
}
