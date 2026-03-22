import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ChannelMessageCreatedEvent } from '../../../domain/events/channel-message-created.event';
import { ChannelMessageUpdatedEvent } from '../../../domain/events/channel-message-updated.event';
import { ChannelMessageDeletedEvent } from '../../../domain/events/channel-message-deleted.event';
import { ChannelReadEvent } from '../../../domain/events/channel-read.event';
import { moderationQueue } from '~/redis/moderation.queue';
import { ChannelMessageGateway } from '../../../presenter/gateways/channel-message.gateway';
import {
  GetMembersInServerUseCase,
  GetTotalUnreadChannelUseCase,
} from '../../usecases';

@Injectable()
export class ChannelMessageHandler {
  constructor(
    private readonly gateway: ChannelMessageGateway,
    private readonly getMembersUseCase: GetMembersInServerUseCase,
    private readonly getTotalUnreadUseCase: GetTotalUnreadChannelUseCase,
  ) {}

  @OnEvent('channel-message.created')
  async handleMessageCreated(event: ChannelMessageCreatedEvent) {
    const { message, channel, member, tempId } = event;

    // 1. Emit to WebSockets
    this.gateway.emitMessageCreated(message, channel.id, tempId);

    // 2. Business notification logic
    const members = await this.getMembersUseCase.execute(member.serverId, channel.id);
    const readingProfileIds = await this.gateway.getConnectedProfileIdsInChannel(
      channel.id,
    );

    for (const m of members) {
      if (m.profileId === member.profileId) continue;
      if (readingProfileIds.has(m.profileId)) continue;

      this.gateway.emitChannelNotification({
        profileId: m.profileId,
        serverId: member.serverId,
        channelId: channel.id,
        inc: 1,
        isNotify: m.channelReads[0]?.isNotify ?? true,
        senderName: member.profile?.name,
        content: message.content,
        channelName: channel.name,
        serverName: channel.server?.name,
      });
    }

    // 3. Add to Moderation Queue
    try {
      await moderationQueue.add('scan-message', {
        messageId: message.id,
        content: message.content,
      });
    } catch (error) {
      console.error('Failed to enqueue channel moderation job:', error);
    }
  }

  @OnEvent('channel-message.updated')
  async handleMessageUpdated(event: ChannelMessageUpdatedEvent) {
    this.gateway.emitMessageUpdated(event.message);
  }

  @OnEvent('channel-message.deleted')
  async handleMessageDeleted(event: ChannelMessageDeletedEvent) {
    this.gateway.emitMessageDeleted(event.messageId, event.channelId);
  }

  @OnEvent('channel.read')
  async handleChannelRead(event: ChannelReadEvent) {
    this.gateway.emitChannelRead(event.profileId, {
      channelId: event.channelId,
      serverId: event.serverId,
      lastReadAt: event.lastReadAt,
    });

    const totalUnread = await this.getTotalUnreadUseCase.execute(
      event.serverId,
      event.profileId,
    );

    this.gateway.emitServerUnreadUpdate(event.profileId, {
      serverId: event.serverId,
      totalUnread,
    });
  }
}
