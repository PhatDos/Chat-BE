import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '~/common/guards/auth.guard';
import { CurrentProfile } from '~/common/decorators/current-profile.decorator';

@Controller('profile')
@UseGuards(AuthGuard)
export class ProfileController {
  @Get()
  async getMyProfile(@CurrentProfile() profile: any) {
    return profile;
  }
}


