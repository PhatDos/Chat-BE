import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '~/prisma/prisma.service';

export const CurrentProfile = createParamDecorator(
  async (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const userId = request.user?.id || request.userId;

    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }

    const prisma = request.app?.get(PrismaService) || new PrismaService();

    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new UnauthorizedException('User profile not found');
    }

    return profile;
  },
);
