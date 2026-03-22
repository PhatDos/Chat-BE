import { Injectable, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CHANNEL_MESSAGE_REPOSITORY } from '../../domain/repositories/channel-message.repository.interface';
import type { IChannelMessageRepository } from '../../domain/repositories/channel-message.repository.interface';
import { MessageEntity } from '../../domain/entities/message.entity';
import { ChannelMessageDeletedEvent } from '../../domain/events/channel-message-deleted.event';

@Injectable()
export class DeleteChannelMessageUseCase {
  constructor(
    @Inject(CHANNEL_MESSAGE_REPOSITORY)
    private readonly channelMessageRepo: IChannelMessageRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(id: string) {
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

    messageEntity.markDeleted();

    const deletedMessage = await this.channelMessageRepo.updateMessage(id, {
      content: messageEntity.content,
      fileUrl: messageEntity.fileUrl,
      deleted: messageEntity.deleted,
    });

    this.eventEmitter.emit(
      'channel-message.deleted',
      new ChannelMessageDeletedEvent(id, messageEntity.channelId),
    );

    return deletedMessage;
  }
}
