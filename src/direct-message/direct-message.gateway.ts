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
import { DirectMessageService } from './direct-message.service';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class DirectMessageGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly directMessageService: DirectMessageService) {}

  // ============================
  // CONNECTION IO
  // ============================
  handleConnection(client: Socket) {
    console.log(`✅ Socket connected: ${client.id}`);
    this.server.emit('Connected', 'A new client has connected.');
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ Socket disconnected: ${client.id}`);
  }

  // ============================
  // 1️⃣ Client join room
  // ============================
  @SubscribeMessage('conversation:join')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { conversationId: string },
  ) {
    client.join(payload.conversationId);
    console.log(`👉 Client joined room: ${payload.conversationId}`);
  }

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

    // Event realtime FE sẽ nghe
    const eventName = 'conversation:message';

    this.server.to(conversationId).emit(eventName, message);
    console.log(`📨 New message in room ${conversationId}`);

    return message;
  }

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
}
