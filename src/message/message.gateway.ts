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
  cors: {
    origin: [
      'https://chat-web-app-phat.vercel.app',
      'https://phat-chat.duckdns.org',
      'http://localhost:3000',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  path: '/socket.io',
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

    // 4️⃣ Notify user còn lại
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

  /* ============================= */
  /*            CHANNEL            */
  /* ============================= */
  @SubscribeMessage('channel:message:create')
  async handleCreateChannelMessage(
    @MessageBody()
    payload: {
      tempId: string; // 👈 FE tạo
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

    // Notify other members in the same server (exclude sender)
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
