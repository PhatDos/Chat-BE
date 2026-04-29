import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentProfile } from '~/common/decorators/current-profile.decorator';
import type { Profile } from '~/common/types/profile.type';
import { NewsfeedService } from './newsfeed.service';
import { CursorQueryDto } from './dto/cursor-query.dto';

@Controller('feed')
export class FeedController {
  constructor(private readonly newsfeedService: NewsfeedService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getFeed(
    @CurrentProfile() profile: Profile,
    @Query(ValidationPipe) query: CursorQueryDto,
  ) {
    return await this.newsfeedService.getFeed(profile.id, query.cursor, query.limit);
  }
}
