import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Member } from '@prisma/client';

export const CurrentMember = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Member => {
    const req = ctx.switchToHttp().getRequest();
    return req.member;
  },
);
