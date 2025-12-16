import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // Try to extract Bearer token from Authorization header
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7); // Remove 'Bearer ' prefix
      try {
        // Decode JWT token from Clerk (without verification - adjust if needed)
        const decoded = this.jwtService.decode(token) as any;
        userId = decoded?.sub || decoded?.userId || decoded?.user_id;
      } catch (error) {
        console.error('Failed to decode JWT token:', error);
      }
    }

    // Fallback to other sources if no Bearer token
    if (!userId) {
      userId =
        request.auth?.userId || // Clerk context
        request.user?.id || // Passport JWT
        request.userId || // Custom middleware
        request.headers['x-user-id']; // Custom header
    }

    if (!userId) {
      throw new UnauthorizedException('Missing user authentication');
    }

    request.userId = userId;
    return true;
  }
}
