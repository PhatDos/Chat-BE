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
import { WEBSOCKET_GATEWAY_CONFIG } from './gateway.config';

@WebSocketGateway(WEBSOCKET_GATEWAY_CONFIG)

export class MessageGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`✅ Socket connected: ${client.id}`);
    client.emit('connected', { message: 'Connected successfully' });
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ Socket disconnected: ${client.id}`);
  }

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
}
