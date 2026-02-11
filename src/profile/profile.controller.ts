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
    if (!profile) {
      throw new UnauthorizedException('Profile not found');
    }

    // CurrentProfile decorator đã query profile, không cần query lại
    return {
      id: profile.id,
      userId: profile.userId,
      name: profile.name,
      imageUrl: profile.imageUrl,
      email: profile.email,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
