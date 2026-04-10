import { Injectable, Inject } from '@nestjs/common';
import { CHANNEL_MESSAGE_REPOSITORY } from '../../domain/repositories/channel-message.repository.interface';
import type { IChannelMessageRepository } from '../../domain/repositories/channel-message.repository.interface';

@Injectable()
export class GetTotalUnreadChannelUseCase {
  constructor(
    @Inject(CHANNEL_MESSAGE_REPOSITORY)
    private readonly channelMessageRepo: IChannelMessageRepository,
  ) {}

  async execute(serverId: string, profileId: string) {
    const member = await this.channelMessageRepo.findMemberByProfileId(
      profileId,
      serverId,
    );

    if (!member) {
      throw new Error('User is not a member of this server');
    }

    return this.channelMessageRepo.getTotalUnread(serverId, member.id);
  }
}
