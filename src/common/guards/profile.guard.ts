import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { ProfileService } from '~/profile/profile.service';

@Injectable()
export class ProfileGuard implements CanActivate {
  constructor(private profileService: ProfileService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const profile = await this.profileService.getOrCreateProfile(req.userId);
    req.profile = profile;

    return true;
  }
}
