import { Module } from '@nestjs/common';
import { NewsfeedService } from './newsfeed.service';
import { PostsController } from './posts.controller';
import { FeedController } from './feed.controller';
import { FollowController } from './follow.controller';

@Module({
  providers: [NewsfeedService],
  controllers: [PostsController, FeedController, FollowController],
})
export class NewsfeedModule {}
