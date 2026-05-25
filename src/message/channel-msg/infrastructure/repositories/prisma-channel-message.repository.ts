import { Injectable } from '@nestjs/common';
import { PrismaService } from '~/prisma/prisma.service';
import { IChannelMessageRepository } from '../../domain/repositories/channel-message.repository.interface';
import { FileType } from '~/generated/prisma';
import { randomUUID } from 'node:crypto';

@Injectable()
export class PrismaChannelMessageRepository
  implements IChannelMessageRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async createMessage(data: {
    content: string;
    fileUrl?: string;
    fileType: string;
    memberId: string;
    channelId: string;
  }) {
    return this.prisma.message.create({
      data: {
        content: data.content,
        fileUrl: data.fileUrl,
        fileType: data.fileType as FileType,
        member: { connect: { id: data.memberId } },
        channel: { connect: { id: data.channelId } },
      },
      include: {
        member: { include: { profile: true } },
      },
    });
  }

  async findOneMessage(id: string) {
    return this.prisma.message.findUnique({
      where: { id },
      include: { member: { include: { profile: true } } },
    });
  }

  async updateMessage(
    id: string,
    data: { content?: string; fileUrl?: string; deleted?: boolean },
  ) {
    const updateData: any = { ...data };
    if (data.deleted) {
      updateData.content = 'This message has been deleted';
      updateData.fileUrl = null;
    }

    return this.prisma.message.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        content: true,
        fileUrl: true,
        fileType: true,
        memberId: true,
        channelId: true,
        deleted: true,
        createdAt: true,
        updatedAt: true,
        isFlagged: true,
        flagReason: true,
        member: { include: { profile: true } },
      },
    });
  }

  async getMessages(channelId: string, limit: number, cursor?: string) {
    const messages = await this.prisma.message.findMany({
      where: { channelId },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { member: { include: { profile: true } } },
    });

    const nextCursor =
      messages.length === limit ? messages[messages.length - 1].id : null;
    return { items: messages, nextCursor };
  }

  async findChannel(channelId: string) {
    return this.prisma.channel.findUnique({
      where: { id: channelId },
      include: { server: true },
    });
  }

  async findMemberByUserId(userId: string, serverId: string) {
    return this.prisma.member.findFirst({
      where: {
        serverId,
        profile: { userId },
      },
      include: { profile: true },
    });
  }

  async findMemberByProfileId(profileId: string, serverId: string) {
    return this.prisma.member.findUnique({
      where: {
        serverId_profileId: { serverId, profileId },
      },
      include: { profile: true },
    });
  }

  async getMembersInServer(serverId: string, channelId: string) {
    return this.prisma.member.findMany({
      where: { serverId },
      select: {
        id: true,
        profileId: true,
        serverId: true,
        profile: { select: { userId: true, name: true } },
        channelReads: {
          where: { channelId },
          select: { isNotify: true },
        },
      },
    });
  }

  async getChannelRead(memberId: string, channelId: string) {
    return this.prisma.channelRead.findUnique({
      where: {
        memberId_channelId: { memberId, channelId },
      },
    });
  }

  async markChannelAsReadByIdentity(
    channelId: string,
    serverId: string,
    identity: string,
  ) {
    const newId = randomUUID();

    const rows = await this.prisma.$queryRaw<
      {
        id: string;
        memberId: string;
        profileId: string;
        channelId: string;
        lastReadAt: Date;
        formerLastReadAt: Date | null;
        isNotify: boolean;
      }[]
    >`
      WITH target_member AS (
        SELECT m."_id" AS "memberId", m."profileId" AS "profileId"
        FROM "Member" m
        JOIN "Profile" p ON p."_id" = m."profileId"
        WHERE m."serverId" = ${serverId}
          AND (p."userId" = ${identity} OR p."_id" = ${identity})
        LIMIT 1
      )
      INSERT INTO "ChannelRead" (
        "_id",
        "memberId",
        "channelId",
        "lastReadAt",
        "formerLastReadAt",
        "isNotify"
      )
      SELECT ${newId}, tm."memberId", ${channelId}, NOW(), NULL, TRUE
      FROM target_member tm
      ON CONFLICT ("memberId", "channelId")
      DO UPDATE SET
        "formerLastReadAt" = "ChannelRead"."lastReadAt",
        "lastReadAt" = NOW()
      RETURNING
        "_id" AS "id",
        "memberId",
        (SELECT tm."profileId" FROM target_member tm LIMIT 1) AS "profileId",
        "channelId",
        "lastReadAt",
        "formerLastReadAt",
        "isNotify"
    `;

    return rows[0] ?? null;
  }

  async upsertChannelRead(
    memberId: string,
    channelId: string,
    updateData: any,
    createData: any,
  ) {
    return this.prisma.channelRead.upsert({
      where: {
        memberId_channelId: { memberId, channelId },
      },
      update: updateData,
      create: {
        memberId,
        channelId,
        ...createData,
      },
    });
  }

  async getTotalUnread(serverId: string, memberId: string): Promise<number> {
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
        AND (m."memberId" IS NULL OR m."memberId" <> ${memberId})
        AND (
          cr."lastReadAt" IS NULL
          OR m."createdAt" > cr."lastReadAt"
        )
    `;
    return Number(result[0]?.total ?? 0);
  }
}
