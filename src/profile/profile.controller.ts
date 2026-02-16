import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { CurrentProfile } from '~/common/decorators/current-profile.decorator';

@Controller('profile')
export class ProfileController {
  @Get()
  async getMyProfile(@CurrentProfile() profile: any) {
    return profile;
  }
}


