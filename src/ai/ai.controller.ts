import { Controller, Get, Param } from '@nestjs/common';
import { CurrentProfile } from '../common/decorators/current-profile.decorator';
import type { Profile } from '../common/types/profile.type';
import { AiService, type UnreadSummaryResponse } from './ai.service';
import { MessageFetcherService } from './message-fetcher.service';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly messageFetcher: MessageFetcherService,
  ) {}

  @Get(':channelId/unread-summary')
  async summarizeUnread(
    @Param('channelId') channelId: string,
    @CurrentProfile() profile: Profile,
  ): Promise<UnreadSummaryResponse> {
    const member = await this.messageFetcher.getMemberByChannelAndProfile(
      channelId,
      profile.id,
    );

    const messages = await this.messageFetcher.getUnreadMessages(
      channelId,
      member.id,
    );

    if (!messages.length) {
      return {
        summary: 'No unread messages 🎉',
        mainTopics: [],
        decisions: [],
        importantQuestions: [],
        actionItems: [],
      };
    }

    return this.aiService.summarizeMessages(messages);
  }
}
