import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '~/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getPublicProfile(id: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        bio: true,
        relationshipStatus: true,
        joinDate: true,
        location: true,
        isOnline: true,
      },
    });

    if (!profile) throw new NotFoundException('User not found');

    return profile;
  }

  async isFriend(currentProfileId: string, targetProfileId: string) {
    if (!currentProfileId) return false;

    const [userOneId, userTwoId] =
      currentProfileId < targetProfileId
        ? [currentProfileId, targetProfileId]
        : [targetProfileId, currentProfileId];

    const friend = await this.prisma.friend.findUnique({
      where: { userOneId_userTwoId: { userOneId, userTwoId } },
    });

    return !!friend;
  }
}
