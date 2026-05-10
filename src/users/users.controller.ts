import { Controller, Get, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentProfile } from '~/common/decorators/current-profile.decorator';
import type { Profile } from '~/common/types/profile.type';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get(':id')
  async getUserProfile(@Param('id') id: string) {
    return await this.usersService.getPublicProfile(id);
  }

  @Get(':id/friend')
  async checkFriend(
    @CurrentProfile() profile: Profile,
    @Param('id') id: string,
  ) {
    const isFriend = await this.usersService.isFriend(profile?.id, id);
    return { isFriend };
  }
}
