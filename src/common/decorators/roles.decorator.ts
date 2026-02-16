import { SetMetadata } from '@nestjs/common';
import { MemberRole } from '@prisma/client';

export const Roles = (...roles: MemberRole[]) => SetMetadata('roles', roles);
