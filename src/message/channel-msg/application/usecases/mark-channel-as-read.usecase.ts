import { Injectable, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CHANNEL_MESSAGE_REPOSITORY } from '../../domain/repositories/channel-message.repository.interface';
import type { IChannelMessageRepository } from '../../domain/repositories/channel-message.repository.interface';
import { ChannelReadEvent } from '../../domain/events/channel-read.event';

@Injectable()
export class MarkChannelAsReadUseCase {
  constructor(
    @Inject(CHANNEL_MESSAGE_REPOSITORY)
    private readonly channelMessageRepo: IChannelMessageRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(channelId: string, serverId: string, profileId: string) {
    const member = await this.channelMessageRepo.findMemberByProfileId(
      profileId,
      serverId,
    );

    if (!member) {
      throw new Error('User is not a member of this server');
    }

    const channelRead = await this.channelMessageRepo.getChannelRead(
      member.id,
      channelId,
    );

    if (channelRead && Date.now() - channelRead.lastReadAt.getTime() < 1000) {
      this.eventEmitter.emit(
        'channel.read',
        new ChannelReadEvent(
          channelId,
          serverId,
          profileId,
          channelRead.lastReadAt,
        ),
      );
      return channelRead;
    }

    const updatedChannelRead = await this.channelMessageRepo.upsertChannelRead(
      member.id,
      channelId,
      {
        formerLastReadAt: channelRead?.lastReadAt,
        lastReadAt: new Date(),
      },
      {
        lastReadAt: new Date(),
      },
    );

    this.eventEmitter.emit(
      'channel.read',
      new ChannelReadEvent(
        channelId,
        serverId,
        profileId,
        updatedChannelRead.lastReadAt,
      ),
    );

    return updatedChannelRead;
  }
}
