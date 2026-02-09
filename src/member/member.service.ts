import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '~/prisma/prisma.service';
import { MemberRole } from '@prisma/client';

@Injectable()
export class MemberService {
  constructor(private prisma: PrismaService) {}

  async deleteMember(memberId: string, serverId: string, profileId: string) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    // Only server owner can delete members
    if (server.profileId !== profileId) {
      throw new ForbiddenException('Only server owner can delete members');
    }

    // Get the member to delete
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      include: { profile: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.profileId === server.profileId) {
      throw new BadRequestException('Cannot delete server owner');
    }

    // Delete the member
    await this.prisma.member.delete({
      where: { id: memberId },
    });

    // Return updated server with members
    const updatedServer = await this.prisma.server.findUnique({
      where: { id: serverId },
      include: {
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

    return updatedServer;
  }

  async updateMemberRole(memberId: string, serverId: string, profileId: string, role: MemberRole) {
    // Verify server exists and user is owner
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    // Only server owner can update roles
    if (server.profileId !== profileId) {
      throw new ForbiddenException('Only server owner can update member roles');
    }

    // Get the member to update
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Cannot update server owner role
    if (member.profileId === server.profileId) {
      throw new BadRequestException('Cannot update server owner role');
    }

    // Update the member role
    await this.prisma.member.update({
      where: { id: memberId },
      data: { role },
    });

    // Return updated server with members
    const updatedServer = await this.prisma.server.findUnique({
      where: { id: serverId },
      include: {
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

    return updatedServer;
  }
}
