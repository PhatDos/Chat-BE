import { Injectable, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CHANNEL_MESSAGE_REPOSITORY } from '../../domain/repositories/channel-message.repository.interface';
import type { IChannelMessageRepository } from '../../domain/repositories/channel-message.repository.interface';
import { MessageEntity } from '../../domain/entities/message.entity';
import { ChannelMessageUpdatedEvent } from '../../domain/events/channel-message-updated.event';

@Injectable()
export class UpdateChannelMessageUseCase {
  constructor(
    @Inject(CHANNEL_MESSAGE_REPOSITORY)
    private readonly channelMessageRepo: IChannelMessageRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(id: string, data: { content?: string; fileUrl?: string }) {
    const messageData = await this.channelMessageRepo.findOneMessage(id);
    if (!messageData) throw new Error('Message not found');

    const messageEntity = MessageEntity.create({
      id: messageData.id,
      content: messageData.content,
      fileUrl: messageData.fileUrl,
      fileType: messageData.fileType,
      memberId: messageData.memberId,
      channelId: messageData.channelId,
      deleted: messageData.deleted,
    });

    messageEntity.updateContent(data.content, data.fileUrl);

    const updated = await this.channelMessageRepo.updateMessage(id, {
      content: messageEntity.content,
      fileUrl: messageEntity.fileUrl,
    });

    this.eventEmitter.emit(
      'channel-message.updated',
      new ChannelMessageUpdatedEvent(updated),
    );

    return updated;
  }
}
