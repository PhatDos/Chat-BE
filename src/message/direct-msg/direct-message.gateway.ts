import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { DirectMessageService } from './direct-message.service';
import { FileType } from '@prisma/client';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || [],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  path: '/socket.io',
})
export class DirectMessageGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly directMessageService: DirectMessageService) {}

  /* ============================= */
  /*        DIRECT MESSAGE         */
  /* ============================= */
  @SubscribeMessage('dm:create')
  async handleCreateDirectMessage(
    @MessageBody()
    payload: {
      tempId: string;
      content?: string;
      fileUrl?: string;
      fileType?: 'text' | 'img' | 'pdf';
      conversationId: string;
      senderId: string; // profileId
    },
  ) {
    const { tempId, content, fileUrl, conversationId, senderId, fileType } =
      payload;

    const conversation =
      await this.directMessageService.findConversationById(conversationId);

    if (!conversation) {
      this.server.to(`profile:${senderId}`).emit('dm:error', {
        tempId,
        error: 'Conversation not found',
      });
      return;
    }

    if (
      senderId !== conversation.profileOneId &&
      senderId !== conversation.profileTwoId
    ) {
      this.server.to(`profile:${senderId}`).emit('dm:error', {
        tempId,
        error: 'Invalid sender',
      });
      return;
    }

    const message = await this.directMessageService.create({
      content: content ?? '',
      fileUrl: fileUrl ?? null,
      fileType: fileType ? (fileType as FileType) : FileType.text,
      senderId,
      conversationId,
    });

    this.server.to(`conversation:${conversationId}`).emit('dm:create', {
      ...message,
      tempId,
    });

    console.log(`📨 New DM → conversation:${conversationId}`);

    // Notify user còn lại
    const otherProfile =
      conversation.profileOneId === senderId
        ? conversation.profileTwoId
        : conversation.profileOneId;

    this.server.to(`profile:${otherProfile}`).emit('dm:notification', {
      conversationId,
      senderId,
      unread: 1,
    });

    console.log(`🔔 DM notification → profile:${otherProfile}`);
  }

  @SubscribeMessage('dm:update')
  async handleUpdateDirectMessage(
    @MessageBody()
    payload: {
      id: string;
      content?: string;
      fileUrl?: string;
      conversationId: string;
    },
  ) {
    const { id, content, fileUrl, conversationId } = payload;

    const updated = await this.directMessageService.update(id, {
      content,
      fileUrl,
    });

    this.server.to(`conversation:${conversationId}`).emit('dm:update', updated);
    console.log(`✏️ DM updated → conversation:${conversationId}`);

    return updated;
  }

  @SubscribeMessage('dm:delete')
  async handleDeleteDirectMessage(
    @MessageBody() payload: { id: string; conversationId: string },
  ) {
    const { id, conversationId } = payload;

    await this.directMessageService.delete(id);

    this.server.to(`conversation:${conversationId}`).emit('dm:delete', { id });

    console.log(`🗑️ DM deleted → conversation:${conversationId}`);

    return { success: true };
  }
}
