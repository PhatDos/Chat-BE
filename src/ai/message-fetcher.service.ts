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

    const from = readState?.formerLastReadAt ?? new Date();
    const to = readState?.lastReadAt ?? new Date();

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