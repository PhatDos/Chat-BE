import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '~/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { MemberRole } from '@prisma/client';
import { CreateServerDto } from './dto/create-server.dto';
import { UpdateServerDto } from './dto/update-server.dto';
import { PaginationDto } from './dto/pagination.dto';
import { DEFAULT_PAGE_SIZE } from '~/utils/constants';

@Injectable()
export class ServerService {
  constructor(private prisma: PrismaService) {}

  async getServersByProfileId(profileId: string, paginationDto: PaginationDto) {
    const skip = paginationDto.skip ?? 0;
    const limit = paginationDto.limit ?? DEFAULT_PAGE_SIZE;

    // 1️⃣ Lấy servers + memberId + channels
    const [servers, total] = await Promise.all([
      this.prisma.server.findMany({
        where: {
          members: { some: { profileId } },
        },
        include: {
          members: {
            where: { profileId },
            select: { id: true }, // memberId
          },
          channels: {
            select: { id: true },
          },
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

    // 2️⃣ Gom memberIds & channelIds
    const memberIds = servers.flatMap((s) => s.members.map((m) => m.id));
    const channelIds = servers.flatMap((s) => s.channels.map((c) => c.id));

    // 3️⃣ Lấy lastReadAt
    const channelReads = await this.prisma.channelRead.findMany({
      where: {
        memberId: { in: memberIds },
        channelId: { in: channelIds },
      },
      select: {
        memberId: true,
        channelId: true,
        lastReadAt: true,
      },
    });

    // Map: channelId -> lastReadAt
    const lastReadMap = new Map<string, Date>();
    for (const r of channelReads) {
      lastReadMap.set(r.channelId, r.lastReadAt);
    }

    // 4️⃣ Count unread per channel (DB làm việc nặng)
    const unreadByChannel = await this.countUnreadInChannels(
      channelIds,
      profileId,
      lastReadMap,
    );

    const unreadMap = new Map(
      unreadByChannel.map((i) => [i.channelId, i.count]),
    );

    // 5️⃣ Gộp unreadCount theo server
    const data = servers.map((server) => {
      const unreadCount = server.channels.reduce((sum, ch) => {
        return sum + (unreadMap.get(ch.id) ?? 0);
      }, 0);

      return {
        id: server.id,
        name: server.name,
        imageUrl: server.imageUrl,
        unreadCount,
      };
    });

    return {
      data,
      total,
      skip,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createServer(profileId: string, dto: CreateServerDto) {
    const server = await this.prisma.server.create({
      data: {
        profileId,
        name: dto.name,
        imageUrl: dto.imageUrl,
        inviteCode: uuidv4(),
        channels: {
          create: [{ name: 'general', profileId }],
        },
        members: {
          create: [{ profileId, role: MemberRole.SERVEROWNER }],
        },
      },
    });

    return server;
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
        imageUrl: dto.imageUrl,
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

    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      include: { members: true },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    // User cannot leave if they are the server owner
    if (server.profileId === profileId) {
      throw new ForbiddenException('Server owner cannot leave the server');
    }

    // Check if user is a member
    const isMember = server.members.some((m) => m.profileId === profileId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this server');
    }

    // Remove user from members
    const updatedServer = await this.prisma.server.update({
      where: { id: serverId },
      data: {
        members: {
          deleteMany: {
            profileId,
          },
        },
      },
    });

    return updatedServer;
  }

  async updateInviteCode(serverId: string, profileId: string) {
    // Check if server exists and user is a member
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      include: { members: true },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    // Check if user is a member (or owner)
    const isMember = server.members.some((m) => m.profileId === profileId);
    if (!isMember && server.profileId !== profileId) {
      throw new ForbiddenException('You are not a member of this server');
    }

    // Update invite code
    const updatedServer = await this.prisma.server.update({
      where: { id: serverId },
      data: { inviteCode: uuidv4() },
    });

    return updatedServer;
  }

  async getUnreadMap(serverId: string, profileId: string) {

    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      select: { id: true },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    // Verify member (owner is also a member)
    const member = await this.prisma.member.findFirst({
      where: {
        serverId,
        profileId,
      },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this server');
    }

    // Get channels
    const channels = await this.prisma.channel.findMany({
      where: { serverId },
      select: { id: true },
    });

    // Get read state
    const reads = await this.prisma.channelRead.findMany({
      where: { memberId: member.id },
    });

    const readMap = new Map<string, Date>(
      reads.map((r) => [r.channelId, r.lastReadAt]),
    );

    // Count unread
    const unreadStats = await this.countUnreadInChannels(
      channels.map((c) => c.id),
      profileId,
      readMap,
    );

    const result: Record<string, number> = {};
    for (const stat of unreadStats) {
      result[stat.channelId] = stat.count;
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
      return {
        id: server.id,
        name: server.name,
        imageUrl: server.imageUrl,
      };
    }

    const updatedServer = await this.prisma.server.update({
      where: { id: server.id },
      data: {
        members: {
          create: {
            profileId,
            role: MemberRole.GUEST,
          },
        },
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
      },
    });

    return updatedServer;
  }

  private async countUnreadInChannels(
    channelIds: string[],
    profileId: string,
    lastReadMap: Map<string, Date>,
  ) {
    return await Promise.all(
      channelIds.map(async (channelId) => {
        const lastReadAt = lastReadMap.get(channelId) ?? new Date();

        const count = await this.prisma.message.count({
          where: {
            channelId,
            deleted: false,
            member: { profileId: { not: profileId } },
            createdAt: { gt: lastReadAt },
          },
        });

        return { channelId, count };
      }),
    );
  }
}
