import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '~/prisma/prisma.service';

@Injectable()
export class ServerMemberGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    // Try to get serverId from params first, fallback to body
    const serverId = req.params?.serverId || req.body?.serverId;

    if (!serverId) {
      throw new ForbiddenException('Server ID missing');
    }

    const member = await this.prisma.member.findUnique({
      where: {
        serverId_profileId: {
          serverId,
          profileId: req.profile.id,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('Not a member');
    }

    req.member = member;

    return true;
  }
}
