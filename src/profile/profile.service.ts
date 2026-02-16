import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient } from '@clerk/backend';
import { PrismaService } from '~/prisma/prisma.service';

@Injectable()
export class ProfileService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async getOrCreateProfile(userId: string) {
    let profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      const clerkClient = createClerkClient({
        secretKey: this.configService.get<string>('CLERK_SECRET_KEY')!,
      });

      const clerkUser = await clerkClient.users.getUser(userId);

      profile = await this.prisma.profile.create({
        data: {
          userId,
          name:
            `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() ||
            clerkUser.username ||
            'User',
          email: clerkUser.emailAddresses?.[0]?.emailAddress || '',
          imageUrl: clerkUser.imageUrl || '',
        },
      });
    }

    return profile;
  }
}
