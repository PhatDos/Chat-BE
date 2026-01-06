import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { ChannelMessageService } from './channel-message.service';
import { FileType } from '@prisma/client';
import { WEBSOCKET_GATEWAY_CONFIG } from '../gateway.config';

@WebSocketGateway(WEBSOCKET_GATEWAY_CONFIG)

export class ChannelMessageGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly channelMessageService: ChannelMessageService,
  ) {}

  @SubscribeMessage('channel:message:create')
  async handleCreateChannelMessage(
    @MessageBody()
    payload: {
      tempId: string; // FE gửi để đối chiếu khi nhận phản hồi
      content?: string;
      channelId: string;
      fileType?: 'text' | 'img' | 'pdf';
      memberId: string; // FE gửi userId (Clerk)
      fileUrl?: string;
    },
  ) {
    const {
      tempId,
      content,
      fileUrl,
      channelId,
      memberId: userId,
      fileType,
    } = payload;

    const channel = await this.channelMessageService.findChannel(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    // Map userId → Member
    const member =
      await this.channelMessageService.findMemberByUserIdAndServerId(
        userId,
        channel.serverId,
      );
    if (!member) {
      throw new Error('Member not found in this server');
    }

    const message = await this.channelMessageService.create({
      content: content ?? '',
      fileUrl,
      fileType: fileType ? (fileType as FileType) : FileType.text,
      member: { connect: { id: member.id } },
      channel: { connect: { id: channelId } },
    });

    this.server.to(`channel:${channelId}`).emit('channel:message', {
      message,
      tempId,
    });

    console.log(`📨 New channel message → channel:${channelId}`, {
      messageId: message.id,
      tempId,
    });

    const members = await this.channelMessageService.getMembersInServer(
      member.serverId,
    );

    members
      .filter((m) => m.profileId !== member.profileId)
      .forEach((m) => {
        this.server.to(`profile:${m.profileId}`).emit('channel:notification', {
          serverId: member.serverId,
          channelId,
          inc: 1,
        });
      });

    console.log(`🔔 Channel notify (others) → server:${member.serverId}`);

    return { message, tempId };
  }

  @SubscribeMessage('channel:message:update')
  async handleUpdateChannelMessage(
    @MessageBody()
    payload: {
      id: string;
      content?: string;
      fileUrl?: string;
      channelId: string;
    },
  ) {
    const { id, content, fileUrl, channelId } = payload;

    const updated = await this.channelMessageService.update(id, {
      content,
      fileUrl,
    });

    this.server
      .to(`channel:${channelId}`)
      .emit('channel:message:update', updated);
    console.log(`✏️ Channel updated → channel:${channelId}:${id}`);

    return updated;
  }

  @SubscribeMessage('channel:message:delete')
  async handleDeleteChannelMessage(
    @MessageBody() payload: { id: string; channelId: string },
  ) {
    const { id, channelId } = payload;

    await this.channelMessageService.delete(id);

    this.server
      .to(`channel:${channelId}`)
      .emit('channel:message:delete', { id });
    console.log(`🗑️ Channel message deleted → channel:${channelId}:${id}`);

    return { success: true };
  }
}
