import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Profile } from '@prisma/client';

export const CurrentProfile = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Profile => {
    const req = ctx.switchToHttp().getRequest();
    return req.profile;
  },
);
