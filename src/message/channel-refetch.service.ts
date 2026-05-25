import { Injectable } from '@nestjs/common';
import { PrismaService } from '~/prisma/prisma.service';
import { MessageGateway } from './message.gateway';

@Injectable()
export class ChannelRefetchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageGateway: MessageGateway,
  ) {}

  emitByChannel(channelId: string) {
    if (!channelId) {
      return;
    }

    this.messageGateway.server
      .to(`channel:${channelId}`)
      .emit('channel:refetch');
  }

  async emitByServer(serverId: string) {
    if (!serverId) {
      return;
    }

    const channels = await this.prisma.channel.findMany({
      where: { serverId },
      select: { id: true },
    });

    for (const channel of channels) {
      this.emitByChannel(channel.id);
    }
  }
}
