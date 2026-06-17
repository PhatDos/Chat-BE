import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FileType } from '~/generated/prisma/client';
import { PrismaService } from '~/prisma/prisma.service';

@Injectable()
export class AttachmentService {
  constructor(private readonly prisma: PrismaService) {}

  async getChannelMedia(channelId: string, profileId: string) {
    await this.ensureCanReadChannel(channelId, profileId);

    return this.prisma.message.findMany({
      where: {
        channelId,
        deleted: false,
        fileUrl: { not: null },
        fileType: FileType.img,
      },
      orderBy: { createdAt: 'desc' },
      include: { member: { include: { profile: true } } },
    });
  }

  async getChannelFiles(channelId: string, profileId: string) {
    await this.ensureCanReadChannel(channelId, profileId);

    return this.prisma.message.findMany({
      where: {
        channelId,
        deleted: false,
        fileUrl: { not: null },
        fileType: { not: FileType.img },
      },
      orderBy: { createdAt: 'desc' },
      include: { member: { include: { profile: true } } },
    });
  }

  async getConversationMedia(conversationId: string, profileId: string) {
    await this.ensureCanReadConversation(conversationId, profileId);

    return this.prisma.directMessage.findMany({
      where: {
        conversationId,
        deleted: false,
        fileUrl: { not: null },
        fileType: FileType.img,
      },
      orderBy: { createdAt: 'desc' },
      include: { sender: true },
    });
  }

  async getConversationFiles(conversationId: string, profileId: string) {
    await this.ensureCanReadConversation(conversationId, profileId);

    return this.prisma.directMessage.findMany({
      where: {
        conversationId,
        deleted: false,
        fileUrl: { not: null },
        fileType: { not: FileType.img },
      },
      orderBy: { createdAt: 'desc' },
      include: { sender: true },
    });
  }

  private async ensureCanReadChannel(channelId: string, profileId: string) {
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
      throw new ForbiddenException('You cannot access this channel');
    }
  }

  private async ensureCanReadConversation(
    conversationId: string,
    profileId: string,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { profileOneId: true, profileTwoId: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (
      conversation.profileOneId !== profileId &&
      conversation.profileTwoId !== profileId
    ) {
      throw new ForbiddenException('You cannot access this conversation');
    }
  }
}
