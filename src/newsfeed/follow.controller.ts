import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentProfile } from '~/common/decorators/current-profile.decorator';
import type { Profile } from '~/common/types/profile.type';
import { NewsfeedService } from './newsfeed.service';
import { CursorQueryDto } from './dto/cursor-query.dto';

@Controller()
export class FollowController {
  constructor(private readonly newsfeedService: NewsfeedService) {}

  @Post('users/:id/follow')
  @HttpCode(HttpStatus.OK)
  async follow(
    @CurrentProfile() profile: Profile,
    @Param('id') targetProfileId: string,
  ) {
    return await this.newsfeedService.followUser(profile.id, targetProfileId);
  }

  @Delete('users/:id/follow')
  @HttpCode(HttpStatus.OK)
  async unfollow(
    @CurrentProfile() profile: Profile,
    @Param('id') targetProfileId: string,
  ) {
    return await this.newsfeedService.unfollowUser(profile.id, targetProfileId);
  }

  @Get('me/following')
  @HttpCode(HttpStatus.OK)
  async getMyFollowing(@CurrentProfile() profile: Profile) {
    return await this.newsfeedService.getMyFollowing(profile.id);
  }

  @Get('users/:id/followers')
  @HttpCode(HttpStatus.OK)
  async getFollowers(
    @CurrentProfile() profile: Profile,
    @Param('id') targetProfileId: string,
    @Query(ValidationPipe) query: CursorQueryDto,
  ) {
    return await this.newsfeedService.getFollowers(
      profile.id,
      targetProfileId,
      query.cursor,
      query.limit,
    );
  }
}
