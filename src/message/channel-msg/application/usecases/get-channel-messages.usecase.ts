import { Injectable, Inject } from '@nestjs/common';
import { CHANNEL_MESSAGE_REPOSITORY } from '../../domain/repositories/channel-message.repository.interface';
import type { IChannelMessageRepository } from '../../domain/repositories/channel-message.repository.interface';

@Injectable()
export class GetChannelMessagesUseCase {
  constructor(
    @Inject(CHANNEL_MESSAGE_REPOSITORY)
    private readonly channelMessageRepo: IChannelMessageRepository,
  ) {}

  async execute(channelId: string, cursor?: string) {
    const LIMIT = 20;
    return this.channelMessageRepo.getMessages(channelId, LIMIT, cursor);
  }
}
