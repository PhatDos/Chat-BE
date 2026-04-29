import {
  Body,
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
import { NewsfeedService } from './newsfeed.service';
import { CurrentProfile } from '~/common/decorators/current-profile.decorator';
import type { Profile } from '~/common/types/profile.type';
import { CreatePostDto } from './dto/create-post.dto';
import { CursorQueryDto } from './dto/cursor-query.dto';

@Controller()
export class PostsController {
  constructor(private readonly newsfeedService: NewsfeedService) {}

  @Post('posts')
  @HttpCode(HttpStatus.CREATED)
  async createPost(
    @CurrentProfile() profile: Profile,
    @Body(ValidationPipe) dto: CreatePostDto,
  ) {
    return await this.newsfeedService.createPost(profile.id, dto);
  }

  @Get('users/:id/posts')
  @HttpCode(HttpStatus.OK)
  async getUserPosts(
    @CurrentProfile() profile: Profile,
    @Param('id') userId: string,
    @Query(ValidationPipe) query: CursorQueryDto,
  ) {
    return await this.newsfeedService.getUserPosts(profile.id, userId, query.cursor);
  }

  @Post('posts/:id/like')
  @HttpCode(HttpStatus.OK)
  async likePost(@CurrentProfile() profile: Profile, @Param('id') postId: string) {
    return await this.newsfeedService.likePost(profile.id, postId);
  }

  @Delete('posts/:id/like')
  @HttpCode(HttpStatus.OK)
  async unlikePost(@CurrentProfile() profile: Profile, @Param('id') postId: string) {
    return await this.newsfeedService.unlikePost(profile.id, postId);
  }
}
