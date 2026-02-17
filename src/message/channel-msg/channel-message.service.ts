import { Injectable } from '@nestjs/common';
import { PrismaService } from '~/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ChannelMessageService {
  constructor(private readonly prisma: PrismaService) {}

  async testQuery(channelId: string) {
    console.time('DB_QUERY');

    const result = await this.prisma.message.findMany({
      where: {
        channelId,
        deleted: false,
      },
      take: 50,
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.timeEnd('DB_QUERY');

    return result;
  }

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
    // Check if user is part of this server - optimized with unique index
    const member = await this.prisma.member.findUnique({
      where: {
        serverId_profileId: {
          serverId,
          profileId,
        },
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
    const member = await this.prisma.member.findUnique({
      where: {
        serverId_profileId: {
          serverId,
          profileId,
        },
      },
      select: { id: true },
    });

    if (!member) {
      throw new Error('User is not a member of this server');
    }

    const memberId = member.id;

    const result = await this.prisma.$queryRaw<{ total: bigint }[]>`
    SELECT COUNT(*) AS total
    FROM "Message" m
    JOIN "Channel" c
      ON m."channelId" = c."_id"
    LEFT JOIN "ChannelRead" cr
      ON cr."channelId" = m."channelId"
      AND cr."memberId" = ${memberId}
    WHERE
      c."serverId" = ${serverId}
      AND m."deleted" = false
      AND m."memberId" <> ${memberId}
      AND m."createdAt" >
          COALESCE(cr."lastReadAt", to_timestamp(0))
  `;

    return Number(result[0]?.total ?? 0);
  }
}
