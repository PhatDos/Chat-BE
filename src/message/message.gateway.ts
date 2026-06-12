import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PresenceService } from '~/presence/presence.service';
import { WEBSOCKET_GATEWAY_CONFIG } from './gateway.config';
import {
  FindChannelUseCase,
  MarkChannelAsReadUseCase,
} from './channel-msg/application/usecases';

type SocketProfileData = {
  profileId?: unknown;
};

@WebSocketGateway(WEBSOCKET_GATEWAY_CONFIG)
export class MessageGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly findChannelUseCase: FindChannelUseCase,
    private readonly markAsReadUseCase: MarkChannelAsReadUseCase,
    private readonly presenceService: PresenceService,
  ) {}

  afterInit(server: Server) {
    // Listen for Redis key expirations for presence keys and notify clients
    this.presenceService.onExpired((profileId: string) => {
      server.emit('presence:offline', { profileId });
    });
  }

  private getClientProfileId(client: Socket): string | undefined {
    const profileId = (client.data as SocketProfileData).profileId;
    return typeof profileId === 'string' && profileId.length > 0
      ? profileId
      : undefined;
  }

  private setClientProfileId(client: Socket, profileId: string): void {
    (client.data as SocketProfileData).profileId = profileId;
  }

  handleConnection(client: Socket) {
    console.log(`Socket connected: ${client.id}`);
    client.emit('connected', { message: 'Connected successfully' });
  }

  handleDisconnect(client: Socket) {
    console.log(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('profile:join')
  async handleJoinProfileRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { profileId: string },
  ) {
    const result = await this.presenceService.ping(payload.profileId);

    this.setClientProfileId(client, result.profileId);
    await client.join(`profile:${result.profileId}`);

    if (result.isStatusChanged) {
      this.server.emit('presence:online', { profileId: result.profileId });
    }

    return result;
  }

  @SubscribeMessage('presence:ping')
  async handlePresencePing(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { profileId?: string },
  ) {
    const profileId = payload?.profileId ?? this.getClientProfileId(client);
    const result = await this.presenceService.ping(profileId);

    this.setClientProfileId(client, result.profileId);
    await client.join(`profile:${result.profileId}`);

    if (result.isStatusChanged) {
      this.server.emit('presence:online', { profileId: result.profileId });
    }

    return result;
  }

  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    await client.join(`conversation:${payload.conversationId}`);
    console.log(
      `Joined conversation room: conversation:${payload.conversationId}`,
    );
  }

  @SubscribeMessage('channel:join')
  async handleJoinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { channelId: string },
  ) {
    await client.join(`channel:${payload.channelId}`);
    console.log(`Joined channel room: channel:${payload.channelId}`);
  }

  @SubscribeMessage('channel:leave')
  async handleLeaveChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { channelId: string },
  ) {
    await client.leave(`channel:${payload.channelId}`);
    console.log(`Left channel room: channel:${payload.channelId}`);

    const profileId = this.getClientProfileId(client);
    if (!profileId) return;

    void this.findChannelUseCase
      .execute(payload.channelId)
      .then((channelResult: unknown) => {
        const channel = channelResult as { serverId: string } | null;
        if (!channel) return;
        return this.markAsReadUseCase.execute(
          payload.channelId,
          channel.serverId,
          profileId,
        );
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.warn('channel:leave markChannelAsRead failed', message);
      });
  }

  emitPollUpdated(payload: {
    channelId: string;
    action: 'created' | 'voted' | 'deleted';
    question: string;
    pollId?: string;
  }) {
    this.server.to(`channel:${payload.channelId}`).emit('poll:updated', payload);
  }
}
