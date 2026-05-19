import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { MessageFetcherService } from './message-fetcher.service';

@Module({
  providers: [AiService, MessageFetcherService],
  controllers: [AiController],
  exports: [AiService, MessageFetcherService],
})
export class AiModule {}
