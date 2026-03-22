import { Injectable, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CHANNEL_MESSAGE_REPOSITORY } from '../../domain/repositories/channel-message.repository.interface';
import type { IChannelMessageRepository } from '../../domain/repositories/channel-message.repository.interface';
import { MemberEntity } from '../../domain/entities/member.entity';
import { MessageEntity } from '../../domain/entities/message.entity';
import { ChannelMessageCreatedEvent } from '../../domain/events/channel-message-created.event';

@Injectable()
export class CreateChannelMessageUseCase {
  constructor(
    @Inject(CHANNEL_MESSAGE_REPOSITORY)
    private readonly channelMessageRepo: IChannelMessageRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: {
    tempId?: string;
    content?: string;
    fileUrl?: string;
    fileType?: string;
    channelId: string;
    userId: string; // Clerk user ID
  }) {
    const channel = await this.channelMessageRepo.findChannel(dto.channelId);
    if (!channel) throw new Error('Channel not found');

    const memberData = await this.channelMessageRepo.findMemberByUserId(
      dto.userId,
      channel.serverId,
    );
    MemberEntity.validateExists(memberData);

    const member = MemberEntity.create({
      id: memberData.id,
      profileId: memberData.profileId,
      serverId: memberData.serverId,
      name: memberData.profile?.name,
    });

    // Domain Business Rule check
    member.ensureInServer(channel.serverId);

    const messageEntity = MessageEntity.create({
      content: dto.content,
      fileUrl: dto.fileUrl,
      fileType: dto.fileType,
      memberId: member.id,
      channelId: dto.channelId,
    });

    const message = await this.channelMessageRepo.createMessage({
      content: messageEntity.content,
      fileUrl: messageEntity.fileUrl,
      fileType: messageEntity.fileType,
      memberId: messageEntity.memberId,
      channelId: messageEntity.channelId,
    });

    // Fire Domain Event
    this.eventEmitter.emit(
      'channel-message.created',
      new ChannelMessageCreatedEvent(message, channel, memberData, dto.tempId),
    );

    return { message, channel, member: memberData };
  }
}
