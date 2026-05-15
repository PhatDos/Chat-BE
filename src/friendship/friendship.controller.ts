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

  // send friend request
  @Post('profiles/:profileId/friend')
  @HttpCode(HttpStatus.CREATED)
  async sendFriendRequest(@CurrentProfile() profile: Profile, @Param('profileId') targetId: string) {
    return await this.friendshipService.sendFriendRequest(profile.id, targetId);
  }

  // get friendship info
  @Get('profiles/:profileId/friend')
  @HttpCode(HttpStatus.OK)
  async getFriendship(
    @CurrentProfile() profile: Profile,
    @Param('profileId') targetId: string,
  ) {
    return await this.friendshipService.getFriendshipInfo(profile.id, targetId);
  }

  // remove friend
  @Delete('profiles/:profileId/friend')
  @HttpCode(HttpStatus.OK)
  async removeFriend(@CurrentProfile() profile: Profile, @Param('profileId') targetId: string) {
    return await this.friendshipService.removeFriend(profile.id, targetId);
  }

  // list received pending requests
  @Get('friend-requests')
  @HttpCode(HttpStatus.OK)
  async listReceived(@CurrentProfile() profile: Profile) {
    return await this.friendshipService.listReceivedRequests(profile.id);
  }

  // list sent requests
  @Get('friend-requests/sent')
  @HttpCode(HttpStatus.OK)
  async listSent(@CurrentProfile() profile: Profile) {
    return await this.friendshipService.listSentRequests(profile.id);
  }

  // accept request
  @Post('friend-requests/:id/accept')
  @HttpCode(HttpStatus.OK)
  async acceptRequest(@CurrentProfile() profile: Profile, @Param('id') requestId: string) {
    return await this.friendshipService.acceptFriendRequest(requestId, profile.id);
  }

  // reject request
  @Post('friend-requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectRequest(@CurrentProfile() profile: Profile, @Param('id') requestId: string) {
    return await this.friendshipService.rejectFriendRequest(requestId, profile.id);
  }

  // cancel (sender)
  @Delete('friend-requests/:id')
  @HttpCode(HttpStatus.OK)
  async cancelRequest(@CurrentProfile() profile: Profile, @Param('id') requestId: string) {
    return await this.friendshipService.cancelFriendRequest(requestId, profile.id);
  }
}
