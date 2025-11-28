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

  // 2️⃣ Client gửi message → Lưu DB → Emit cho room
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

    // Lưu vào DB
    const message = await this.directMessageService.create({
      content: content!,
      fileUrl,
      member: { connect: { id: memberId } },
      conversation: { connect: { id: conversationId } },
    });

    // Event realtime FE sẽ nghe
    const eventName = 'conversation:message';

    // Emit cho những client đã join room
    this.server.to(conversationId).emit(eventName, message);
    console.log(`📨 New message in room ${conversationId}`);

    return message;
  }
}
