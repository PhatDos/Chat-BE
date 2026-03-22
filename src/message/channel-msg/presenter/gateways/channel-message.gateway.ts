import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { WEBSOCKET_GATEWAY_CONFIG } from '../../../gateway.config';

import {
  CreateChannelMessageUseCase,
  UpdateChannelMessageUseCase,
  DeleteChannelMessageUseCase,
} from '../../application/usecases';

@WebSocketGateway(WEBSOCKET_GATEWAY_CONFIG)
export class ChannelMessageGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly createMessageUseCase: CreateChannelMessageUseCase,
    private readonly updateMessageUseCase: UpdateChannelMessageUseCase,
    private readonly deleteMessageUseCase: DeleteChannelMessageUseCase,
  ) {}

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

    const { message } = await this.createMessageUseCase.execute({
      tempId,
      content,
      fileUrl,
      fileType,
      channelId,
      userId: profileId,
    });

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
    const { id, content, fileUrl } = payload;
    const updated = await this.updateMessageUseCase.execute(id, {
      content,
      fileUrl,
    });
    return updated;
  }

  @SubscribeMessage('channel:message:delete')
  async handleDeleteChannelMessage(
    @MessageBody() payload: { id: string; channelId: string },
  ) {
    const { id } = payload;
    await this.deleteMessageUseCase.execute(id);
    return { success: true };
  }

  // --- Exposed emit methods for Event Handler ---

  emitMessageCreated(message: any, channelId: string, tempId?: string) {
    this.server.to(`channel:${channelId}`).emit('channel:message', {
      message,
      tempId,
    });
  }

  async getConnectedProfileIdsInChannel(channelId: string): Promise<Set<string>> {
    const socketsInChannel = await this.server.in(`channel:${channelId}`).allSockets();
    const profileIds = new Set<string>();

    for (const socketId of socketsInChannel) {
      const socket = this.server.sockets.sockets.get(socketId);
      const profileId = socket?.data?.profileId;
      if (typeof profileId === 'string' && profileId.length > 0) {
        profileIds.add(profileId);
      }
    }

    return profileIds;
  }

  emitChannelNotification(payload: {
    profileId: string;
    serverId: string;
    channelId: string;
    inc: number;
    isNotify: boolean;
    senderName?: string;
    content?: string;
    channelName?: string;
    serverName?: string;
  }) {
    const { profileId, ...notificationPayload } = payload;
    this.server
      .to(`profile:${profileId}`)
      .emit('channel:notification', notificationPayload);
  }

  emitChannelRead(
    profileId: string,
    payload: {
      channelId: string;
      serverId: string;
      lastReadAt: Date;
    },
  ) {
    this.server.to(`profile:${profileId}`).emit('channel:mark-read', payload);
  }

  emitServerUnreadUpdate(
    profileId: string,
    payload: {
      serverId: string;
      totalUnread: number;
    },
  ) {
    this.server
      .to(`profile:${profileId}`)
      .emit('server:unread-update', payload);
  }

  emitMessageUpdated(updatedMessage: any) {
    this.server
      .to(`channel:${updatedMessage.channelId}`)
      .emit('channel:message:update', updatedMessage);
    console.log(
      `✏️ Channel updated → channel:${updatedMessage.channelId}:${updatedMessage.id}`,
    );
  }

  emitMessageDeleted(messageId: string, channelId: string) {
    this.server
      .to(`channel:${channelId}`)
      .emit('channel:message:delete', { id: messageId });
    console.log(
      `🗑️ Channel message deleted → channel:${channelId}:${messageId}`,
    );
  }
}
