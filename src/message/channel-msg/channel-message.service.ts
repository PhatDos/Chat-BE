import { Injectable } from '@nestjs/common';
import { PrismaService } from '~/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ChannelMessageService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createChannelMessageDto: Prisma.MessageCreateInput) {
    return this.prisma.message.create({
      data: createChannelMessageDto,
      include: {
        member: { include: { profile: true } },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.message.findUnique({
      where: { id },
      include: { member: { include: { profile: true } } },
    });
  }

  async update(id: string, updateChannelMessageDto: Prisma.MessageUpdateInput) {
    return this.prisma.message.update({
      where: { id },
      data: updateChannelMessageDto,
      include: { member: { include: { profile: true } } },
    });
  }

  async delete(id: string) {
    return this.prisma.message.update({
      where: { id },
      data: {
        fileUrl: null,
        content: 'This message has been deleted',
        deleted: true,
      },
      include: { member: { include: { profile: true } } },
    });
  }

  async getMessages(channelId: string, cursor?: string) {
    const LIMIT = 20;
    const messages = await this.prisma.message.findMany({
      where: { channelId },
      take: LIMIT,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { member: { include: { profile: true } } },
    });
    const nextCursor =
      messages.length === LIMIT ? messages[messages.length - 1].id : null;
    return { items: messages, nextCursor };
  }

  async findChannel(channelId: string) {
    return this.prisma.channel.findUnique({ where: { id: channelId } });
  }

  async findMemberByUserIdAndServerId(userId: string, serverId: string) {
    return this.prisma.member.findFirst({
      where: {
        serverId,
        profile: {
          userId, // Clerk userId
        },
      },
      include: {
        profile: true,
      },
    });
  }

  async findMemberById(id: string) {
    return this.prisma.member.findUnique({
      where: { id },
      include: { profile: true },
    });
  }
}
