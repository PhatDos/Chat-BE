import { Injectable } from '@nestjs/common';
import { PrismaService } from '~/prisma/prisma.service';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async findByProfileId(profileId: string) {
    return this.prisma.profile.findUnique({
      where: { id: profileId },
      select: { id: true, userId: true },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true, userId: true },
    });
  }
}
