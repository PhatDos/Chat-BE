import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProfileService } from '~/profile/profile.service';
import { SKIP_PROFILE_GUARD_KEY } from '~/common/decorators/skip-profile-guard.decorator';

@Injectable()
export class ProfileGuard implements CanActivate {
  constructor(
    private profileService: ProfileService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const shouldSkip = this.reflector.getAllAndOverride<boolean>(
      SKIP_PROFILE_GUARD_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (shouldSkip) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const path = String(req.originalUrl ?? req.url ?? '').split('?')[0];
    const isReadEndpoint =
      req.method === 'POST' && /^\/channel-messages\/[^/]+\/read$/.test(path);

    const profile = await this.profileService.getOrCreateProfile(req.userId);
    req.profile = profile;

    return true;
  }
}
