import { Injectable, Inject } from '@nestjs/common';
import { CHANNEL_MESSAGE_REPOSITORY } from '../../domain/repositories/channel-message.repository.interface';
import type { IChannelMessageRepository } from '../../domain/repositories/channel-message.repository.interface';

@Injectable()
export class FindMemberUseCase {
  constructor(
    @Inject(CHANNEL_MESSAGE_REPOSITORY)
    private readonly channelMessageRepo: IChannelMessageRepository,
  ) {}

  async execute(userId: string, serverId: string) {
    return this.channelMessageRepo.findMemberByUserId(userId, serverId);
  }
}
