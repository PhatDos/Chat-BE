import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Sse,
} from '@nestjs/common';
import { CurrentProfile } from '~/common/decorators/current-profile.decorator';
import type { Profile } from '~/common/types/profile.type';
import { FriendshipService } from './friendship.service';
import { ListFriendRequestsQueryDto } from './dto/list-friend-requests.query.dto';
import { ApiResponse } from '~/common/bases/api-response';
import { Observable } from 'rxjs';

@Controller()
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}

  // send friend request
  @Post('profiles/:profileId/friend')
  @HttpCode(HttpStatus.CREATED)
  async sendFriendRequest(
    @CurrentProfile() profile: Profile,
    @Param('profileId') targetId: string,
  ) {
    const data = await this.friendshipService.sendFriendRequest(
      profile.id,
      targetId,
    );
    return ApiResponse.ok(data, 'Friend request sent', HttpStatus.CREATED);
  }

  // get friendship info
  @Get('profiles/:profileId/friend')
  @HttpCode(HttpStatus.OK)
  async getFriendship(
    @CurrentProfile() profile: Profile,
    @Param('profileId') targetId: string,
  ) {
    const data = await this.friendshipService.getFriendshipInfo(
      profile.id,
      targetId,
    );
    return ApiResponse.ok(data, 'Friendship info retrieved', HttpStatus.OK);
  }

  // friend list for current user
  @Get('friends')
  @HttpCode(HttpStatus.OK)
  async getFriendList(@CurrentProfile() profile: Profile) {
    const data = await this.friendshipService.getFriendList(profile.id);
    return ApiResponse.ok(data, 'Friends retrieved', HttpStatus.OK);
  }

  // remove friend
  @Delete('profiles/:profileId/friend')
  @HttpCode(HttpStatus.OK)
  async removeFriend(
    @CurrentProfile() profile: Profile,
    @Param('profileId') targetId: string,
  ) {
    const data = await this.friendshipService.removeFriend(
      profile.id,
      targetId,
    );
    return ApiResponse.ok(data, 'Friend removed', HttpStatus.OK);
  }

  // list received pending requests
  @Get('friend-requests')
  @HttpCode(HttpStatus.OK)
  async listReceived(
    @CurrentProfile() profile: Profile,
    @Query() query: ListFriendRequestsQueryDto,
  ) {
    const result = await this.friendshipService.listFriendRequests({
      currentProfileId: profile.id,
      direction: 'received',
      skip: query.skip,
      limit: query.limit,
      status: query.status,
    });
    return ApiResponse.ok(
      result,
      'Received friend requests retrieved',
      HttpStatus.OK,
    );
  }

  // list sent requests
  @Get('friend-requests/sent')
  @HttpCode(HttpStatus.OK)
  async listSent(
    @CurrentProfile() profile: Profile,
    @Query() query: ListFriendRequestsQueryDto,
  ) {
    const result = await this.friendshipService.listFriendRequests({
      currentProfileId: profile.id,
      direction: 'sent',
      skip: query.skip,
      limit: query.limit,
      status: query.status,
    });
    return ApiResponse.ok(result, 'Friend requests retrieved', HttpStatus.OK);
  }

  @Sse('friend-requests/events')
  subscribeToEvents(@CurrentProfile() profile: Profile): Observable<any> {
    return this.friendshipService.subscribeToEvents(profile.id);
  }

  // accept request
  @Post('friend-requests/:id/accept')
  @HttpCode(HttpStatus.OK)
  async acceptRequest(
    @CurrentProfile() profile: Profile,
    @Param('id') requestId: string,
  ) {
    const data = await this.friendshipService.acceptFriendRequest(
      requestId,
      profile.id,
    );
    return ApiResponse.ok(data, 'Friend request accepted', HttpStatus.OK);
  }

  // reject request
  @Post('friend-requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectRequest(
    @CurrentProfile() profile: Profile,
    @Param('id') requestId: string,
  ) {
    const data = await this.friendshipService.rejectFriendRequest(
      requestId,
      profile.id,
    );
    return ApiResponse.ok(data, 'Friend request rejected', HttpStatus.OK);
  }

  // cancel (sender)
  @Delete('friend-requests/:id')
  @HttpCode(HttpStatus.OK)
  async cancelRequest(
    @CurrentProfile() profile: Profile,
    @Param('id') requestId: string,
  ) {
    const data = await this.friendshipService.cancelFriendRequest(
      requestId,
      profile.id,
    );
    return ApiResponse.ok(data, 'Friend request cancelled', HttpStatus.OK);
  }
}
