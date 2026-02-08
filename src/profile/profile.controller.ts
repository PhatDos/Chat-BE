import {
  Controller,
  Get,
  Post,
  UseGuards,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { AuthGuard } from '~/common/guards/auth.guard';
import { CurrentProfile } from '~/common/decorators/current-profile.decorator';

@Controller('profile')
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Post('register')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async register(@Req() req: any) {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('User not found');
    }

    return await this.profileService.createProfile(userId);
  }

  @Post('initial')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async initialProfile(@Req() req: any) {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('User not found');
    }

    return await this.profileService.initialProfile(userId);
  }

  @Get()
  @UseGuards(AuthGuard)
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
