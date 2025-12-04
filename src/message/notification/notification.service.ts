import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async getServerUnread(memberId: string) {
    const servers = await this.prisma.server.findMany({
      where: { members: { some: { id: memberId } } },
      select: {
        id: true,
        channels: {
          select: {
            id: true,
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { createdAt: true },
            },
          },
        },
      },
    });

    const reads = await this.prisma.channelRead.findMany({
      where: { memberId },
      select: { channelId: true, lastReadAt: true },
    });

    const readMap = new Map(reads.map((r) => [r.channelId, r.lastReadAt]));

    return servers.map((server) => {
      let unreadCount = 0;

      for (const ch of server.channels) {
        const lastMsg = ch.messages[0];
        const lastRead = readMap.get(ch.id);

        if (lastMsg && (!lastRead || lastMsg.createdAt > lastRead)) {
          unreadCount++;
        }
      }

      return { serverId: server.id, unreadCount };
    });
  }

  async getConversationUnread(profileId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ profileOneId: profileId }, { profileTwoId: profileId }],
      },
      select: {
        id: true,
        directMessages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    const reads = await this.prisma.conversationRead.findMany({
      where: { profileId },
      select: { conversationId: true, lastReadAt: true },
    });

    const readMap = new Map(reads.map((r) => [r.conversationId, r.lastReadAt]));

    return conversations.map((cv) => {
      const lastMsg = cv.directMessages[0];
      const lastRead = readMap.get(cv.id);

      const unread =
        lastMsg && (!lastRead || lastMsg.createdAt > lastRead) ? 1 : 0;

      return { conversationId: cv.id, unread };
    });
  }
}
