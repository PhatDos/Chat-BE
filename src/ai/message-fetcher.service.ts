import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessageFetcherService {
  constructor(private prisma: PrismaService) {}

  async getMemberByChannelAndProfile(channelId: string, profileId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { serverId: true },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    const member = await this.prisma.member.findUnique({
      where: {
        serverId_profileId: {
          serverId: channel.serverId,
          profileId,
        },
      },
      select: { id: true },
    });

    if (!member) {
      throw new ForbiddenException('Not a member');
    }

    return member;
  }

  async getUnreadMessages(channelId: string, memberId: string) {
    const readState = await this.prisma.channelRead.findUnique({
      where: {
        memberId_channelId: {
          memberId,
          channelId,
        },
      },
    });

    if (!readState) {
      return [];
    }

    // If formerLastReadAt is null we should consider the earliest time
    // (epoch) so that the first-time fetch returns messages before lastReadAt.
    // Previously using `new Date()` made `from` == now which returned no messages.
    const from = readState?.formerLastReadAt ?? new Date(0);
    const to = readState?.lastReadAt ?? new Date();

    // Temporary debug log to help verify values when calling the AI summary
    console.log('[AI Summary Debug] getUnreadMessages', {
      channelId,
      memberId,
      formerLastReadAt: readState?.formerLastReadAt,
      lastReadAt: readState?.lastReadAt,
      from: from?.toISOString?.() ?? String(from),
      to: to?.toISOString?.() ?? String(to),
    });

    return this.prisma.message.findMany({
      where: {
        channelId,
        createdAt: {
          gt: from,
          lte: to,
        },
      },
      select: {
        content: true,
        member: {
          select: {
            profile: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 200,
    });
  }
}
