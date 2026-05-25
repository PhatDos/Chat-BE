import { Controller, Get, Param } from '@nestjs/common';
import { CurrentProfile } from '../common/decorators/current-profile.decorator';
import type { Profile } from '../common/types/profile.type';
import { AiService } from './ai.service';
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
  ) {
    const member = await this.messageFetcher.getMemberByChannelAndProfile(
      channelId,
      profile.id,
    );

    const messages = await this.messageFetcher.getUnreadMessages(
      channelId,
      member.id,
    );

    if (!messages.length) {
      return { summary: 'No unread messages 🎉' };
    }

    const summary = await this.aiService.summarizeMessages(messages);

    return { summary };
  }
}
