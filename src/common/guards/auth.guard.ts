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
    const path = String(req.originalUrl ?? req.url ?? '').split('?')[0];
    const isReadEndpoint =
      req.method === 'POST' &&
      /^\/channel-messages\/[^/]+\/read$/.test(path);
    const startedAt = Date.now();

    if (isReadEndpoint) {
      req.__perfRead = req.__perfRead ?? {
        traceId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        startedAt,
      };
    }

    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }

    const token = authHeader.slice(7);

    try {
      const clerkSecretKey =
        this.configService.get<string>('CLERK_SECRET_KEY');
      const verifyStartedAt = Date.now();

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
