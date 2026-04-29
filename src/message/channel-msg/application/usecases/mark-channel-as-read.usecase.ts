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

  async execute(
    channelId: string,
    serverId: string,
    profileId: string,
    traceId?: string,
  ) {
    return this.markAsReadInternal(channelId, serverId, profileId, traceId);
  }

  async executeByUserId(
    channelId: string,
    serverId: string,
    userId: string,
    traceId?: string,
  ) {
    return this.markAsReadInternal(channelId, serverId, userId, traceId);
  }

  private async markAsReadInternal(
    channelId: string,
    serverId: string,
    identity: string,
    traceId?: string,
  ) {
    const totalStartedAt = Date.now();
    const queryStartedAt = Date.now();

    const updatedChannelRead =
      await this.channelMessageRepo.markChannelAsReadByIdentity(
        channelId,
        serverId,
        identity,
      );

    if (!updatedChannelRead) {
      throw new Error('User is not a member of this server');
    }

    const emitStartedAt = Date.now();
    this.eventEmitter.emit(
      'channel.read',
      new ChannelReadEvent(
        channelId,
        serverId,
        updatedChannelRead.profileId,
        updatedChannelRead.lastReadAt,
      ),
    );

    return updatedChannelRead;
  }
}
