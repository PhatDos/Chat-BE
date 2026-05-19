import { Module } from '@nestjs/common';
import { AiGenerationService } from './ai-generation.service';
import { AiModule } from '../ai/ai.module';
import { FileExtractionService } from './file-extraction.service';

@Module({
  imports: [AiModule],
  providers: [AiGenerationService, FileExtractionService],
  exports: [AiGenerationService, FileExtractionService],
})
export class AiGenerationModule {}
