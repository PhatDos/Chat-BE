import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '~/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { MemberRole, Prisma, ServerVisibility, type Member } from '~/generated/prisma/client';
import { CreateServerDto } from './dto/create-server.dto';
import { UpdateServerDto } from './dto/update-server.dto';
import { PaginationDto } from './dto/pagination.dto';
import { DEFAULT_PAGE_SIZE } from '~/utils/constants';
import { ChannelService } from '~/channel/channel.service';
import type { InitialServerResponseDto } from './dto/initial-server-response.dto';

const serverSearchSelect = {
  id: true,
  name: true,
  description: true,
  imageUrl: true,
  inviteCode: true,
  visibility: true,
  memberCount: true,
} as const;

@Injectable()
export class ServerService {
  constructor(
    private prisma: PrismaService,
    private channelService: ChannelService,
  ) {}

  async getServersByProfileId(profileId: string, paginationDto: PaginationDto) {
    const skip = paginationDto.skip ?? 0;
    const limit = paginationDto.limit ?? DEFAULT_PAGE_SIZE;

    // 1️⃣ Lấy server list
    const [servers, total] = await Promise.all([
      this.prisma.server.findMany({
        where: {
          members: { some: { profileId } },
        },
        select: {
          id: true,
          name: true,
          imageUrl: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.server.count({
        where: {
          members: { some: { profileId } },
        },
      }),
    ]);

    if (servers.length === 0) {
      return {
        data: [],
        total,
        skip,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    const serverIds = servers.map((s) => s.id);

    // 2️⃣ Aggregate unread theo serverId
    const unread = await this.prisma.$queryRaw<
      { serverId: string; total: bigint }[]
    >`
      SELECT 
        c."serverId" as "serverId",
        COUNT(m."_id") as total
      FROM "Channel" c
      JOIN "Member" mem
        ON mem."serverId" = c."serverId"
      AND mem."profileId" = ${profileId}
      LEFT JOIN "ChannelRead" cr
        ON cr."channelId" = c."_id"
      AND cr."memberId" = mem."_id"
      JOIN "Message" m
        ON m."channelId" = c."_id"
      WHERE
        c."serverId" IN (${Prisma.join(serverIds)})
        AND (m."memberId" IS NULL OR m."memberId" <> mem."_id")
        AND (
          cr."lastReadAt" IS NULL
          OR m."createdAt" > cr."lastReadAt"
        )
      GROUP BY c."serverId"
      `;

    const unreadMap = new Map<string, number>();
    for (const row of unread) {
      unreadMap.set(row.serverId, Number(row.total));
    }

    const data = servers.map((server) => ({
      ...server,
      unreadCount: unreadMap.get(server.id) ?? 0,
    }));

    return {
      data,
      total,
      skip,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createServer(profileId: string, dto: CreateServerDto) {
    // Create server, its general channel and owner member in a single transaction
    const created = await this.prisma.$transaction(async (tx) => {
      const server = await tx.server.create({
        data: {
          profileId,
          name: dto.name,
          description: dto.description?.trim() || null,
          imageUrl: dto.imageUrl,
          inviteCode: uuidv4(),
          visibility: dto.visibility ?? ServerVisibility.PRIVATE,
          memberCount: 1,
        },
      });

      const channel = await tx.channel.create({
        data: {
          name: 'general',
          profileId,
          serverId: server.id,
        },
      });

      await tx.server.update({
        where: { id: server.id },
        data: { generalChannelId: channel.id },
      });

      await tx.member.create({
        data: {
          serverId: server.id,
          profileId,
          role: MemberRole.SERVEROWNER,
        },
      });

      return tx.server.findUnique({
        where: { id: server.id },
        include: { channels: true, members: true, generalChannel: true },
      });
    });

    return created;
  }

  async updateServer(
    serverId: string,
    profileId: string,
    dto: UpdateServerDto,
  ) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    // Only server owner can update
    if (server.profileId !== profileId) {
      throw new ForbiddenException('Only server owner can update this server');
    }

    const updatedServer = await this.prisma.server.update({
      where: { id: serverId },
      data: {
        name: dto.name,
        description: dto.description?.trim() || null,
        imageUrl: dto.imageUrl,
        ...(dto.visibility ? { visibility: dto.visibility } : {}),
      },
    });

    return updatedServer;
  }

  async deleteServer(serverId: string, profileId: string) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    // Only server owner can delete
    if (server.profileId !== profileId) {
      throw new ForbiddenException('Only server owner can delete this server');
    }

    const deletedServer = await this.prisma.server.delete({
      where: { id: serverId },
    });

    return deletedServer;
  }

  async leaveServer(serverId: string, profileId: string) {
    // Guard đã verify membership
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      select: { id: true, profileId: true },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    // User cannot leave if they are the server owner
    if (server.profileId === profileId) {
      throw new ForbiddenException('Server owner cannot leave the server');
    }

    // Remove user from members
    const updatedServer = await this.prisma.server.update({
      where: { id: serverId },
      data: {
        memberCount: { decrement: 1 },
        members: {
          deleteMany: {
            profileId,
          },
        },
      },
    });

    return updatedServer;
  }

  async updateInviteCode(serverId: string) {
    // Guard đã verify membership & role
    // Update invite code
    const updatedServer = await this.prisma.server.update({
      where: { id: serverId },
      data: { inviteCode: uuidv4() },
    });

    return updatedServer;
  }

  async getUnreadMap(serverId: string, profileId: string) {
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
      throw new NotFoundException('Member not found');
    }

    const memberId = member.id;

    const unread = await this.prisma.$queryRaw<
      { channelId: string; count: bigint }[]
    >`
    SELECT 
      m."channelId" as "channelId",
      COUNT(*) as count
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
    GROUP BY m."channelId"
  `;

    const result: Record<string, number> = {};

    for (const row of unread) {
      result[row.channelId] = Number(row.count);
    }

    return result;
  }

  async joinServerByInviteCode(inviteCode: string, profileId: string) {
    const server = await this.prisma.server.findFirst({
      where: { inviteCode },
      include: { members: true },
    });

    if (!server) {
      throw new NotFoundException('Server not found or invite code is invalid');
    }

    // User is already a member
    const existingMember = server.members.find(
      (m) => m.profileId === profileId,
    );
    if (existingMember) {
      return server;
    }

    return this.prisma.$transaction(async (tx) => {
      // bulk create member + channelRead
      const now = new Date();

      const member = await tx.member.create({
        data: {
          serverId: server.id,
          profileId,
          role: MemberRole.GUEST,
        },
      });

      await tx.server.update({
        where: { id: server.id },
        data: { memberCount: { increment: 1 } },
      });

      const channels = await tx.channel.findMany({
        where: { serverId: server.id },
        select: { id: true },
      });

      if (channels.length > 0) {
        await tx.channelRead.createMany({
          data: channels.map((channel) => ({
            memberId: member.id,
            channelId: channel.id,
            lastReadAt: now,
          })),
          skipDuplicates: true,
        });
      }

      return server;
    });
  }

  async searchServers(profileId: string, query: string, limit = DEFAULT_PAGE_SIZE) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: { id: true },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      throw new BadRequestException('Search query is required');
    }

    return this.prisma.server.findMany({
      where: {
        visibility: ServerVisibility.PUBLIC,
        name: {
          contains: normalizedQuery,
          mode: 'insensitive',
        },
      },
      select: serverSearchSelect,
      orderBy: {
        createdAt: 'desc',
      },
      take: Math.min(limit, DEFAULT_PAGE_SIZE),
    });
  }

  async getTopPublicServers(limit = 3) {
    return this.prisma.server.findMany({
      where: {
        visibility: ServerVisibility.PUBLIC,
      },
      select: serverSearchSelect,
      orderBy: [
        {
          memberCount: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
      take: Math.min(limit, 3),
    });
  }

  async getInitialServer(
    profileId: string,
  ): Promise<InitialServerResponseDto | null> {
    // include `generalChannel` so FE can directly use `generalChannelId`/data
    const server = await this.prisma.server.findFirst({
      where: {
        members: {
          some: {
            profileId,
          },
        },
      },
      include: { generalChannel: true },
    });

    if (!server) {
      return null;
    }

    return {
      server,
      initialChannel: server.generalChannel
        ? {
            channelId: server.generalChannel.id,
            channelName: server.generalChannel.name,
          }
        : null,
    };
  }

  async getServerAccess(serverId: string, member: Member) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        profileId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    return {
      server,
      member: {
        id: member.id,
        role: member.role,
        profileId: member.profileId,
        serverId: member.serverId,
      },
    };
  }

  async getServerSidebarData(serverId: string, profileId: string) {
    const server = await this.prisma.server.findUnique({
      where: {
        id: serverId,
      },
      include: {
        generalChannel: true,
        channels: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        members: {
          include: {
            profile: true,
          },
          orderBy: {
            role: 'asc',
          },
        },
      },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    const textChannels = server.channels.filter(
      (channel) => channel.type === 'TEXT',
    );
    const audioChannels = server.channels.filter(
      (channel) => channel.type === 'AUDIO',
    );
    const videoChannels = server.channels.filter(
      (channel) => channel.type === 'VIDEO',
    );
    const members = server.members.filter(
      (member) => member.profileId !== profileId,
    );

    const role = server.members.find(
      (member) => member.profileId === profileId,
    )?.role;

    return {
      server,
      textChannels,
      audioChannels,
      videoChannels,
      members,
      role,
    };
  }
}
