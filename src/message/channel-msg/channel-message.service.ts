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
    return this.prisma.channel.findUnique({
      where: { id: channelId },
      include: { server: true },
    });
  }

  async findMemberByProfileIdAndServerId(userId: string, serverId: string) {
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

  async markChannelAsRead(
    channelId: string,
    serverId: string,
    profileId: string,
  ) {
    // Check if user is part of this server
    const member = await this.prisma.member.findFirst({
      where: {
        profileId,
        serverId,
      },
    });

    if (!member) {
      throw new Error('User is not a member of this server');
    }

    return this.prisma.channelRead.upsert({
      where: {
        memberId_channelId: {
          memberId: member.id,
          channelId,
        },
      },
      update: {
        lastReadAt: new Date(),
      },
      create: {
        memberId: member.id,
        channelId,
        lastReadAt: new Date(),
      },
    });
  }

  async getMembersInServer(serverId: string) {
    return this.prisma.member.findMany({
      where: { serverId },
      select: {
        id: true,
        profileId: true,
        serverId: true,
        profile: {
          select: {
            userId: true,
          },
        },
      },
    });
  }

  async getTotalUnreadForSpecificServer(serverId: string, profileId: string) {
    const member = await this.prisma.member.findFirst({
      where: { serverId, profileId },
      select: { id: true },
    });

    if (!member) {
      throw new Error('User is not a member of this server');
    }

    const memberId = member.id;

    const unread: Array<Record<string, any>> =
      (await this.prisma.message.aggregateRaw({
        pipeline: [
          { $match: { deleted: false, memberId: { $ne: memberId } } },
          {
            $lookup: {
              from: 'Channel',
              localField: 'channelId',
              foreignField: '_id',
              as: 'channel',
            },
          },
          { $unwind: '$channel' },
          { $match: { 'channel.serverId': serverId } },
          {
            $lookup: {
              from: 'ChannelRead',
              let: { channelId: '$channelId' },
              pipeline: [
                {
                  $match: {
                    memberId,
                    $expr: { $eq: ['$channelId', '$$channelId'] },
                  },
                },
              ],
              as: 'read',
            },
          },
          {
            $addFields: {
              lastReadAt: {
                $ifNull: [{ $first: '$read.lastReadAt' }, new Date(0)],
              },
            },
          },
          { $match: { $expr: { $gt: ['$createdAt', '$lastReadAt'] } } },
          { $count: 'totalUnread' },
        ],
      })) as any;

    const totalUnread = (unread && unread[0] && unread[0].totalUnread) || 0;
    return Number(totalUnread) || 0;
  }
}
