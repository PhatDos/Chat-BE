import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '~/prisma/prisma.service';
import { MemberRole } from '@prisma/client';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@Injectable()
export class ChannelService {
  constructor(private prisma: PrismaService) {}

  async getChannelsByServerId(serverId: string, profileId: string) {
    // Verify user is a member of the server
    const member = await this.prisma.member.findFirst({
      where: {
        serverId,
        profileId,
      },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this server');
    }

    const channels = await this.prisma.channel.findMany({
      where: { serverId },
      orderBy: { createdAt: 'asc' },
    });

    return channels;
  }

  async getChannelById(channelId: string, profileId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: { server: true },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    // Verify user is a member of the server
    const member = await this.prisma.member.findFirst({
      where: {
        serverId: channel.serverId,
        profileId,
      },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this server');
    }

    return channel;
  }

  async createChannel(profileId: string, dto: CreateChannelDto) {
    if (dto.name === 'general') {
      throw new ForbiddenException('Name cannot be "general"');
    }

    const existingChannel = await this.prisma.channel.findFirst({
      where: {
        serverId: dto.serverId,
        name: dto.name,
      },
    });

    if (existingChannel) {
      throw new ForbiddenException('Channel name already exists in this server');
    }

    const server = await this.prisma.server.update({
      where: {
        id: dto.serverId,
        members: {
          some: {
            profileId,
            role: {
              in: [MemberRole.SERVEROWNER, MemberRole.VICESERVEROWNER],
            },
          },
        },
      },
      data: {
        channels: {
          create: {
            profileId,
            name: dto.name,
            type: dto.type,
          },
        },
      },
    });

    return server;
  }

  async updateChannel(
    channelId: string,
    profileId: string,
    dto: UpdateChannelDto,
  ) {
    if (dto.name === 'general') {
      throw new ForbiddenException('Name cannot be "general"');
    }

    if (!dto.serverId) {
      throw new NotFoundException('Server ID is required');
    }

    if (dto.name) {
      const existingChannel = await this.prisma.channel.findFirst({
        where: {
          serverId: dto.serverId,
          name: dto.name,
          id: { not: channelId },
        },
      });

      if (existingChannel) {
        throw new ForbiddenException(
          'Channel name already exists in this server',
        );
      }
    }

    const server = await this.prisma.server.update({
      where: {
        id: dto.serverId,
        members: {
          some: {
            profileId,
            role: {
              in: [MemberRole.SERVEROWNER, MemberRole.VICESERVEROWNER],
            },
          },
        },
      },
      data: {
        channels: {
          update: {
            where: {
              id: channelId,
              NOT: {
                name: 'general',
              },
            },
            data: {
              name: dto.name,
              type: dto.type,
            },
          },
        },
      },
      include: {
        channels: {
          where: { id: channelId },
        },
      },
    });

    if (!server) {
      throw new ForbiddenException(
        'Only server owner or vice owner can update channels',
      );
    }

    const updated = server.channels[0];
    if (!updated) {
      throw new NotFoundException('Channel not found');
    }

    return updated;
  }

  async deleteChannel(channelId: string, profileId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true, serverId: true, name: true },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    if (channel.name === 'general') {
      throw new ForbiddenException('Cannot delete general channel');
    }

    await this.prisma.server.update({
      where: {
        id: channel.serverId,
        members: {
          some: {
            profileId,
            role: {
              in: [MemberRole.SERVEROWNER, MemberRole.VICESERVEROWNER],
            },
          },
        },
      },
      data: {
        channels: {
          delete: { id: channelId },
        },
      },
    });

    return { message: 'Channel deleted successfully' };
  }
}
