import {
  Controller,
  Get,
  UseGuards,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { AuthGuard } from '~/common/guards/auth.guard';
import { CurrentProfile } from '~/common/decorators/current-profile.decorator';

@Controller('profile')
@UseGuards(AuthGuard)
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getMyProfile(@CurrentProfile() profile: any) {
    if (!profile?.id) {
      throw new UnauthorizedException('Profile not found');
    }

    const profileData = await this.profileService.findByProfileId(profile.id);
    if (!profileData) {
      throw new UnauthorizedException('Profile not found');
    }

    return {
      id: profileData.id,
      userId: profileData.userId,
    };
  }
}
