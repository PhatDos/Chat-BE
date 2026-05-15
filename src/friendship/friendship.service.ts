import { Injectable, BadRequestException, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '~/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class FriendshipService {
  constructor(private readonly prisma: PrismaService) {}

  private sortIds(a: string, b: string): [string, string] {
    return a < b ? [a, b] : [b, a];
  }

  private getPairKey(a: string, b: string): string {
    const [first, second] = this.sortIds(a, b);
    return `${first}:${second}`;
  }

  /* Friend request flow */
  async sendFriendRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    const receiver = await this.prisma.profile.findUnique({
      where: { id: receiverId },
      select: { id: true },
    });
    if (!receiver) {
      throw new NotFoundException('Target profile not found');
    }

    // already friends?
    const alreadyFriend = await this.isFriend(senderId, receiverId);
    if (alreadyFriend) throw new ConflictException('Already friends');

    // existing pending request either direction
    const existing = await this.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
        status: 'PENDING',
      },
    });
    if (existing) throw new ConflictException('Pending request already exists');

    const pairKey = this.getPairKey(senderId, receiverId);

    try {
      return await this.prisma.friendRequest.create({
        data: { senderId, receiverId, pairKey, status: 'PENDING' },
      });
    } catch (e) {
      // Handles concurrent inserts violating pair uniqueness.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Pending request already exists');
      }
      // Foreign key constraint failed (sender/receiver profile does not exist).
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new NotFoundException('Target profile not found');
      }
      throw e;
    }
  }

  async acceptFriendRequest(requestId: string, receiverId: string) {
    const req = await this.prisma.friendRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Friend request not found');
    if (req.receiverId !== receiverId) throw new ForbiddenException();

    // create friend record and delete request in transaction
    const [a, b] = this.sortIds(req.senderId, req.receiverId);
    return this.prisma.$transaction([
      this.prisma.friend.create({ data: { userOneId: a, userTwoId: b } }),
      this.prisma.friendRequest.delete({ where: { id: requestId } }),
    ]);
  }

  async rejectFriendRequest(requestId: string, receiverId: string) {
    const req = await this.prisma.friendRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Friend request not found');
    if (req.receiverId !== receiverId) throw new ForbiddenException();

    return this.prisma.friendRequest.delete({ where: { id: requestId } });
  }

  async cancelFriendRequest(requestId: string, senderId: string) {
    const req = await this.prisma.friendRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Friend request not found');
    if (req.senderId !== senderId) throw new ForbiddenException();

    return this.prisma.friendRequest.delete({ where: { id: requestId } });
  }

  async listReceivedRequests(profileId: string) {
    return this.prisma.friendRequest.findMany({
      where: { receiverId: profileId, status: 'PENDING' },
      include: { sender: { select: { id: true, name: true, imageUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listSentRequests(profileId: string) {
    return this.prisma.friendRequest.findMany({
      where: { senderId: profileId },
      include: { receiver: { select: { id: true, name: true, imageUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
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
