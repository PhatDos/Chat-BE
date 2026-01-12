import { createParamDecorator, ExecutionContext, UnauthorizedException, Inject } from '@nestjs/common';
import { PrismaService } from '~/prisma/prisma.service';

export const CurrentProfile = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const prisma: PrismaService = req.prismaService; 
    const userId = req.user?.userId;

    if (!userId) throw new UnauthorizedException();

    if (!prisma) throw new Error('PrismaService not found in request');

    return prisma.profile.findUnique({ where: { userId } });
  },
);
