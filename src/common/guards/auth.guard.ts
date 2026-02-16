import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/backend';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

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

      req.userId = payload.sub;

      return true;
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException('Invalid Clerk token');
    }
  }
}
