import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '~/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class FriendshipService {
  constructor(private readonly prisma: PrismaService) {}

  private sortIds(a: string, b: string): [string, string] {
    return a < b ? [a, b] : [b, a];
  }

  async addFriend(initiatorId: string, targetId: string) {
    if (initiatorId === targetId) {
      throw new BadRequestException('Cannot add yourself as friend');
    }

    const [userOneId, userTwoId] = this.sortIds(initiatorId, targetId);

    try {
      const friend = await this.prisma.friend.create({
        data: { userOneId, userTwoId },
      });

      return friend;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        // unique constraint failed — already friends
        throw new ConflictException('Friendship already exists');
      }
      throw e;
    }
  }

  async removeFriend(initiatorId: string, targetId: string) {
    const [userOneId, userTwoId] = this.sortIds(initiatorId, targetId);

    try {
      await this.prisma.friend.delete({
        where: {
          userOneId_userTwoId: { userOneId, userTwoId },
        },
      });

      return { success: true };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new NotFoundException('Friendship not found');
      }
      throw e;
    }
  }

  async isFriend(a: string, b: string) {
    const [userOneId, userTwoId] = this.sortIds(a, b);
    const friend = await this.prisma.friend.findUnique({
      where: { userOneId_userTwoId: { userOneId, userTwoId } },
    });
    return !!friend;
  }

  async getFriendshipInfo(viewerId: string, targetId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: targetId },
      select: { id: true, name: true, imageUrl: true },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const isFriend = await this.isFriend(viewerId, targetId);

    return {
      id: profile.id,
      name: profile.name,
      imageUrl: profile.imageUrl,
      isFriend,
    };
  }
}
