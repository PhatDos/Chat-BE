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

  async getChannelsByServerId(serverId: string) {
    // Guard đã verify membership
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

    // Verify user is a member - TODO: Use guard when URL refactored
    const member = await this.prisma.member.findUnique({
      where: {
        serverId_profileId: {
          serverId: channel.serverId,
          profileId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this server');
    }

    return channel;
  }

  async createChannel(profileId: string, dto: CreateChannelDto) {
    // Guard đã verify membership & role
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

    const channel = await this.prisma.channel.create({
      data: {
        serverId: dto.serverId,
        profileId: profileId,
        name: dto.name,
        type: dto.type,
      },
    });

    return channel;
  }

  async updateChannel(channelId: string, dto: UpdateChannelDto) {
    // Guard đã verify membership & role
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

    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    if (channel.name === 'general') {
      throw new ForbiddenException('Cannot update general channel');
    }

    const updated = await this.prisma.channel.update({
      where: { id: channelId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.type && { type: dto.type }),
      },
    });

    return updated;
  }

  async deleteChannel(channelId: string) {
    // Guard đã verify membership & role
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

    await this.prisma.channel.delete({
      where: { id: channelId },
    });

    return { message: 'Channel deleted successfully' };
  }
}
