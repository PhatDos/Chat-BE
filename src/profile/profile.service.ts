import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '~/prisma/prisma.service';
import { createClerkClient } from '@clerk/backend';

@Injectable()
export class ProfileService {
  private clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

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

  async createProfile(userId: string) {
    // Kiểm tra profile đã tồn tại chưa
    const existingProfile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      throw new BadRequestException('Profile already exists');
    }

    // Lấy user info từ Clerk
    const clerkUser = await this.clerk.users.getUser(userId);

    if (!clerkUser) {
      throw new UnauthorizedException('User not found in Clerk');
    }

    // Tạo profile mới
    const newProfile = await this.prisma.profile.create({
      data: {
        userId,
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
        imageUrl: clerkUser.imageUrl || '',
        email: clerkUser.emailAddresses?.[0]?.emailAddress || '',
      },
    });

    return newProfile;
  }

  async initialProfile(userId: string) {
    // Tìm profile từ userId
    const existingProfile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      return existingProfile;
    }

    throw new UnauthorizedException('User not found');
  }
}
