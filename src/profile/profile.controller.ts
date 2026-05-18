import { Controller, Get } from '@nestjs/common';
import { CurrentProfile } from '~/common/decorators/current-profile.decorator';
import type { Profile } from '~/common/types/profile.type';

@Controller('profile')
export class ProfileController {
  @Get()
  async getMyProfile(@CurrentProfile() profile: Profile) {
    return profile;
  }
}
