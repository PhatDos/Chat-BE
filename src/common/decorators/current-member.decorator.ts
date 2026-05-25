import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Member } from '~/generated/prisma';

export const CurrentMember = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Member => {
    const req = ctx.switchToHttp().getRequest();
    return req.member;
  },
);
