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

  constructor(private readonly channelMessageService: ChannelMessageService) {}

  @SubscribeMessage('channel:message:create')
  async handleCreateChannelMessage(
    @MessageBody()
    payload: {
      tempId: string;
      content?: string;
      channelId: string;
      fileType?: 'text' | 'img' | 'pdf';
      memberId: string; // profileId
      fileUrl?: string;
    },
  ) {
    const {
      tempId,
      content,
      fileUrl,
      channelId,
      memberId: profileId,
      fileType,
    } = payload;

    const channel = await this.channelMessageService.findChannel(channelId);
    if (!channel) throw new Error('Channel not found');

    const member =
      await this.channelMessageService.findMemberByProfileIdAndServerId(
        profileId,
        channel.serverId,
      );
    if (!member) throw new Error('Member not found');

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

    // lấy socket đang ở channel (đang đọc)
    const socketsInChannel = await this.server
      .in(`channel:${channelId}`)
      .allSockets();

    const members = await this.channelMessageService.getMembersInServer(
      member.serverId,
    );

    for (const m of members) {
      if (m.profileId === member.profileId) continue;

      // Nếu user đang join channel => skip unread
      const isReading = [...socketsInChannel].some((socketId) => {
        const socket = this.server.sockets.sockets.get(socketId);
        return socket?.data?.profileId === m.profileId;
      });

      if (isReading) {
        await this.channelMessageService.markChannelAsRead(
          channelId,
          member.serverId,
          m.profileId,
        );
        continue;
      }

      console.log('member.profileId', m.profileId);
      console.log('is reading', isReading);
      console.log('socketsInChannel', [...socketsInChannel]);

      this.server.to(`profile:${m.profileId}`).emit('channel:notification', {
        serverId: member.serverId,
        channelId,
        inc: 1,
      });
    }

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
