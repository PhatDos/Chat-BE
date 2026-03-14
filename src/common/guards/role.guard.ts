import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MemberRole } from '@prisma/client';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const member = req.member;

    const requiredRoles = this.reflector.get<MemberRole[]>(
      'roles',
      context.getHandler(),
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    if (!member) {
      throw new ForbiddenException('Member not found');
    }

    if (!requiredRoles.includes(member.role)) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}
