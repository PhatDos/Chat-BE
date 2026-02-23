import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Profile } from '~/common/types/profile.type';

export const CurrentProfile = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Profile => {
    const req = ctx.switchToHttp().getRequest();
    return req.profile;
  },
);
