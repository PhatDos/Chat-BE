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

  handleConnection(client: Socket) {
    console.log(`✅ Socket connected: ${client.id}`);
    this.server.emit('Connected', 'A new client has connected.');
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ Socket disconnected: ${client.id}`);
  }

  // CONVERSATION CONVERSATION CONVERSATION CONVERSATION CONVERSATION CONVERSATION
  @SubscribeMessage('conversation:join')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { conversationId: string },
  ) {
    client.join(payload.conversationId);
    console.log(`👉 Client joined room: ${payload.conversationId}`);
  }

  // Create
  @SubscribeMessage('message:create')
  async handleCreateMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      content?: string;
      fileUrl?: string;
      conversationId: string;
      memberId: string;
    },
  ) {
    const { content, fileUrl, conversationId, memberId } = payload;

    const message = await this.directMessageService.create({
      content: content!,
      fileUrl,
      member: { connect: { id: memberId } },
      conversation: { connect: { id: conversationId } },
    });

    const eventName = 'conversation:message';

    this.server.to(conversationId).emit(eventName, message);
    console.log(`📨 New message in room ${conversationId}`);

    return message;
  }

  // Update
  @SubscribeMessage('message:update')
  async handleUpdateMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      id: string; // message ID
      content?: string;
      fileUrl?: string;
      conversationId: string;
    },
  ) {
    const { id, content, fileUrl, conversationId } = payload;

    const updatedMessage = await this.directMessageService.update(id, {
      content,
      fileUrl,
    });

    const eventName = 'conversation:message:update';
    this.server.to(conversationId).emit(eventName, updatedMessage);

    console.log(`✏️ Updated message in room ${conversationId}: ${id}`);

    return updatedMessage;
  }

  @SubscribeMessage('message:delete')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { id: string; conversationId: string },
  ) {
    const { id, conversationId } = payload;

    await this.directMessageService.delete(id);

    this.server.to(conversationId).emit('conversation:message:delete', { id });

    console.log(`🗑️ Deleted message in room ${conversationId}: ${id}`);
    return { success: true };
  }

  // CHANNEL CHANNEL CHANNEL CHANNEL CHANNEL CHANNEL CHANNEL CHANNEL CHANNEL CHANNEL
  @SubscribeMessage('channel:join')
  handleJoinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { channelId: string },
  ) {
    client.join(payload.channelId);
    console.log(`👉 Client joined channel room: ${payload.channelId}`);
  }

  // Create
  @SubscribeMessage('channel:message:create')
  async handleCreateChannelMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      content?: string;
      channelId: string;
      memberId: string;
      fileUrl?: string;
    },
  ) {
    const { content, fileUrl, channelId, memberId: clerkUserId } = payload;

    const channel = await this.channelMessageService.findChannel(channelId);
    if (!channel) throw new Error('Channel not found');

    const member =
      await this.channelMessageService.findMemberByUserIdAndServerId(
        clerkUserId,
        channel.serverId,
      );
    if (!member) throw new Error('Member not found in this server');

    const message = await this.channelMessageService.create({
      content: content!,
      fileUrl,
      member: { connect: { id: member.id } },
      channel: { connect: { id: channelId } },
    });

    // 4️⃣ Emit cho cả channel
    this.server.to(channelId).emit('channel:message', message);
    console.log(`📨 New message in channel ${channelId}`);

    return message;
  }

  // Update
  @SubscribeMessage('channel:message:update')
  async handleUpdateChannelMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      id: string;
      content?: string;
      fileUrl?: string;
      channelId: string;
    },
  ) {
    const { id, content, fileUrl, channelId } = payload;

    const updatedMessage = await this.channelMessageService.update(id, {
      content,
      fileUrl,
    });

    this.server.to(channelId).emit('channel:message:update', updatedMessage);
    console.log(`✏️ Updated message in channel ${channelId}: ${id}`);

    return updatedMessage;
  }

  // Delete
  @SubscribeMessage('channel:message:delete')
  async handleDeleteChannelMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { id: string; channelId: string },
  ) {
    const { id, channelId } = payload;

    await this.channelMessageService.delete(id);

    this.server.to(channelId).emit('channel:message:delete', { id });

    console.log(`🗑️ Deleted message in channel ${channelId}: ${id}`);
    return { success: true };
  }
}
