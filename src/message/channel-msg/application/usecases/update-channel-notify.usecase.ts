import { Injectable, Inject } from '@nestjs/common';
import { CHANNEL_MESSAGE_REPOSITORY } from '../../domain/repositories/channel-message.repository.interface';
import type { IChannelMessageRepository } from '../../domain/repositories/channel-message.repository.interface';

@Injectable()
export class UpdateChannelNotifyUseCase {
  constructor(
    @Inject(CHANNEL_MESSAGE_REPOSITORY)
    private readonly channelMessageRepo: IChannelMessageRepository,
  ) {}

  async execute(
    channelId: string,
    serverId: string,
    profileId: string,
    isNotify: boolean,
  ) {
    const member = await this.channelMessageRepo.findMemberByProfileId(
      profileId,
      serverId,
    );

    if (!member) {
      throw new Error('User is not a member of this server');
    }

    return this.channelMessageRepo.upsertChannelRead(
      member.id,
      channelId,
      { isNotify },
      { lastReadAt: new Date(), isNotify },
    );
  }
}
