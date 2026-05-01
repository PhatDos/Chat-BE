import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentProfile } from '~/common/decorators/current-profile.decorator';
import type { Profile } from '~/common/types/profile.type';
import { FriendshipService } from './friendship.service';

@Controller()
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}

  @Post('users/:id/friend')
  @HttpCode(HttpStatus.CREATED)
  async addFriend(@CurrentProfile() profile: Profile, @Param('id') targetId: string) {
    return await this.friendshipService.addFriend(profile.id, targetId);
  }

  @Get('users/:id/friend')
  @HttpCode(HttpStatus.OK)
  async getFriendship(
    @CurrentProfile() profile: Profile,
    @Param('id') targetId: string,
  ) {
    return await this.friendshipService.getFriendshipInfo(profile.id, targetId);
  }

  @Delete('users/:id/friend')
  @HttpCode(HttpStatus.OK)
  async removeFriend(@CurrentProfile() profile: Profile, @Param('id') targetId: string) {
    return await this.friendshipService.removeFriend(profile.id, targetId);
  }
}
