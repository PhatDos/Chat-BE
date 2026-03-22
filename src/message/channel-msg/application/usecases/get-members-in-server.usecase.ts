import { Injectable, Inject } from '@nestjs/common';
import { CHANNEL_MESSAGE_REPOSITORY } from '../../domain/repositories/channel-message.repository.interface';
import type { IChannelMessageRepository } from '../../domain/repositories/channel-message.repository.interface';

@Injectable()
export class GetMembersInServerUseCase {
  constructor(
    @Inject(CHANNEL_MESSAGE_REPOSITORY)
    private readonly channelMessageRepo: IChannelMessageRepository,
  ) {}

  async execute(serverId: string, channelId: string) {
    return this.channelMessageRepo.getMembersInServer(serverId, channelId);
  }
}
