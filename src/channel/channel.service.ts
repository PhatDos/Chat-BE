import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '~/prisma/prisma.service';
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

  async getChannelById(serverId: string, channelId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: { server: true },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    if (channel.serverId !== serverId) {
      throw new ForbiddenException('Channel does not belong to this server');
    }

    return channel;
  }

  async createChannel(
    serverId: string,
    profileId: string,
    dto: CreateChannelDto,
  ) {
    // Guard đã verify membership & role
    if (dto.name === 'general') {
      throw new ForbiddenException('Name cannot be "general"');
    }

    const existingChannel = await this.prisma.channel.findFirst({
      where: {
        serverId,
        name: dto.name,
      },
    });

    if (existingChannel) {
      throw new ForbiddenException('Channel name already exists in this server');
    }

    const channel = await this.prisma.channel.create({
      data: {
        serverId,
        profileId: profileId,
        name: dto.name,
        type: dto.type,
      },
    });

    return channel;
  }

  async updateChannel(
    serverId: string,
    channelId: string,
    dto: UpdateChannelDto,
  ) {
    // Guard đã verify membership & role
    if (dto.name === 'general') {
      throw new ForbiddenException('Name cannot be "general"');
    }

    if (dto.name) {
      const existingChannel = await this.prisma.channel.findFirst({
        where: {
          serverId,
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

    if (channel.serverId !== serverId) {
      throw new ForbiddenException('Channel does not belong to this server');
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

  async deleteChannel(serverId: string, channelId: string) {
    // Guard đã verify membership & role
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true, serverId: true, name: true },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    if (channel.serverId !== serverId) {
      throw new ForbiddenException('Channel does not belong to this server');
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
