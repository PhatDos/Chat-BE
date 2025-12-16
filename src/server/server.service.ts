import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '~/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { MemberRole } from '@prisma/client';
import { CreateServerDto } from './dto/create-server.dto';
import { UpdateServerDto } from './dto/update-server.dto';

@Injectable()
export class ServerService {
  constructor(private prisma: PrismaService) {}

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

  async updateServer(serverId: string, profileId: string, dto: UpdateServerDto) {
    // Only server owner can update
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

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
    // Only server owner can delete
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    if (server.profileId !== profileId) {
      throw new ForbiddenException('Only server owner can delete this server');
    }

    const deletedServer = await this.prisma.server.delete({
      where: { id: serverId },
    });

    return deletedServer;
  }

  async leaveServer(serverId: string, profileId: string) {
    // Check if server exists and user is a member (but not owner)
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
}
