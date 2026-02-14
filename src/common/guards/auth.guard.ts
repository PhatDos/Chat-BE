import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyToken, createClerkClient } from '@clerk/backend';
import { PrismaService } from '~/prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }

    const token = authHeader.slice(7);

    try {
      const clerkSecretKey =
        this.configService.get<string>('CLERK_SECRET_KEY');

      const payload = await verifyToken(token, {
        secretKey: clerkSecretKey!,
      });

      const clerkClient = createClerkClient({
        secretKey: clerkSecretKey!,
      });

      const userId = payload.sub;

      let profile = await this.prisma.profile.findUnique({
        where: { userId },
      });

      if (!profile) {
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

      req.profile = profile;

      return true;
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException('Invalid Clerk token');
    }
  }
}
