import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyToken } from '@clerk/clerk-sdk-node';
import { PrismaService } from '~/prisma/prisma.service';

// @Injectable()
// export class AuthGuard implements CanActivate {
//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     const req = context.switchToHttp().getRequest();
//     const authHeader = req.headers.authorization;

//     if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException();

//     const token = authHeader.slice(7);

//     try {
//       const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! });

//       req.user = { userId: payload.sub };
//       return true;
//     } catch {
//       throw new UnauthorizedException('Invalid Clerk token');
//     }
//   }
// }

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException();

    const token = authHeader.slice(7);

    try {
      const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! });
      req.user = { userId: payload.sub };
      req.prismaService = this.prisma; // attach Prisma vào request
      return true;
    } catch {
      throw new UnauthorizedException('Invalid Clerk token');
    }
  }
}
