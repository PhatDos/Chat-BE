import { BadRequestException, Injectable, Inject } from '@nestjs/common';
import { CHANNEL_MESSAGE_REPOSITORY } from '../../domain/repositories/channel-message.repository.interface';
import type { IChannelMessageRepository } from '../../domain/repositories/channel-message.repository.interface';

@Injectable()
export class SearchChannelMessagesUseCase {
  constructor(
    @Inject(CHANNEL_MESSAGE_REPOSITORY)
    private readonly channelMessageRepo: IChannelMessageRepository,
  ) {}

  async execute(channelId: string, query: string, limit = 20) {
    const normalizedQuery = query?.trim();

    if (!channelId) {
      throw new BadRequestException('channelId is required');
    }

    if (!normalizedQuery) {
      throw new BadRequestException('Search query is required');
    }

    return this.channelMessageRepo.searchMessages(
      channelId,
      normalizedQuery,
      Math.min(limit, 20),
    );
  }
}
