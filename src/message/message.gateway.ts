import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DirectMessageService } from './direct-msg/direct-message.service';
import { ChannelMessageService } from './channel-msg/channel-message.service';
import { FileType } from '@prisma/client';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class MessageGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly directMessageService: DirectMessageService,
    private readonly channelMessageService: ChannelMessageService,
  ) {}

  //CONNECTION

  handleConnection(client: Socket) {
    console.log(`✅ Socket connected: ${client.id}`);
    client.emit('connected', { message: 'Connected successfully' });
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ Socket disconnected: ${client.id}`);
  }

  /* ============================= */
  /*            ROOMS              */
  /* ============================= */

  @SubscribeMessage('profile:join')
  handleJoinProfileRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { profileId: string },
  ) {
    client.join(`profile:${payload.profileId}`);
    console.log(`👤 Joined profile room: profile:${payload.profileId}`);
  }

  @SubscribeMessage('conversation:join')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    client.join(`conversation:${payload.conversationId}`);
    console.log(
      `👉 Joined conversation room: conversation:${payload.conversationId}`,
    );
  }

  @SubscribeMessage('channel:join')
  handleJoinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { channelId: string },
  ) {
    client.join(`channel:${payload.channelId}`);
    console.log(`👉 Joined channel room: channel:${payload.channelId}`);
  }

  /* ============================= */
  /*        DIRECT MESSAGE         */
  /* ============================= */
  @SubscribeMessage('dm:create')
  async handleCreateDirectMessage(
    @MessageBody()
    payload: {
      content?: string;
      fileUrl?: string;
      fileType?: 'text' | 'img' | 'pdf';
      conversationId: string;
      senderId: string; // profileId
    },
  ) {
    const { content, fileUrl, conversationId, senderId } = payload;

    // 1️⃣ Kiểm tra conversation
    const conversation =
      await this.directMessageService.findConversationById(conversationId);

    if (!conversation) {
      return { error: 'Conversation not found' };
    }

    if (
      senderId !== conversation.profileOneId &&
      senderId !== conversation.profileTwoId
    ) {
      return { error: 'Invalid sender for this conversation' };
    }

    const message = await this.directMessageService.create({
      content: content || '',
      fileUrl: fileUrl ?? null,
      fileType: payload.fileType
        ? (payload.fileType as FileType)
        : FileType.text,
      senderId,
      conversationId,
    });

    this.server.to(`conversation:${conversationId}`).emit('dm:create', message);
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

    return message;
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

  /* ============================= */
  /*            CHANNEL            */
  /* ============================= */
  @SubscribeMessage('channel:message:create')
  async handleCreateChannelMessage(
    @MessageBody()
    payload: {
      content?: string;
      channelId: string;
      fileType?: 'text' | 'img' | 'pdf';
      memberId: string; // FE gửi userId (Clerk), map sang Member
      fileUrl?: string;
    },
  ) {
    const { content, fileUrl, channelId, memberId: userId } = payload;

    const channel = await this.channelMessageService.findChannel(channelId);
    if (!channel) throw new Error('Channel not found');

    // Map userId sang member trong server
    const member =
      await this.channelMessageService.findMemberByUserIdAndServerId(
        userId,
        channel.serverId,
      );
    if (!member) throw new Error('Member not found in this server');

    const message = await this.channelMessageService.create({
      content: content ?? '',
      fileUrl,
      fileType: payload.fileType
        ? (payload.fileType as FileType)
        : FileType.text, // default
      member: { connect: { id: member.id } },
      channel: { connect: { id: channelId } },
    });

    this.server.to(`channel:${channelId}`).emit('channel:message', message);
    console.log(`📨 New channel message → channel:${channelId}`);

    this.server.to(`profile:${member.profileId}`).emit('channel:notification', {
      channelId,
      serverId: member.serverId,
      unread: 1,
    });
    console.log(`🔔 Channel notify → profile:${member.profileId}`);

    return message;
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
