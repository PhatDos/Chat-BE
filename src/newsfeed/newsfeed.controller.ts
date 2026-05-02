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
  Sse,
  ValidationPipe,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { NewsfeedService } from './newsfeed.service';
import { CurrentProfile } from '~/common/decorators/current-profile.decorator';
import type { Profile } from '~/common/types/profile.type';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CursorQueryDto } from './dto/cursor-query.dto';

@Controller()
export class NewsfeedController {
  constructor(private readonly newsfeedService: NewsfeedService) {}

  @Get('posts')
  @HttpCode(HttpStatus.OK)
  async getNewsfeedPosts(
    @CurrentProfile() profile: Profile,
    @Query(ValidationPipe) query: CursorQueryDto,
  ) {
    return await this.newsfeedService.getFeed(
      profile.id,
      query.cursor,
      query.limit,
    );
  }

  @Sse('posts/events')
  subscribeToEvents(@CurrentProfile() profile: Profile): Observable<any> {
    return this.newsfeedService.subscribeToEvents(profile.id);
  }

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

  @Delete('posts/:id')
  @HttpCode(HttpStatus.OK)
  async deletePost(@CurrentProfile() profile: Profile, @Param('id') postId: string) {
    return await this.newsfeedService.deletePost(profile.id, postId);
  }

  @Get('posts/:id/comments')
  @HttpCode(HttpStatus.OK)
  async getComments(
    @CurrentProfile() profile: Profile,
    @Param('id') postId: string,
    @Query(ValidationPipe) query: CursorQueryDto,
  ) {
    return await this.newsfeedService.getComments(profile.id, postId, query.cursor, query.limit);
  }

  @Post('posts/:id/comments')
  @HttpCode(HttpStatus.CREATED)
  async createComment(
    @CurrentProfile() profile: Profile,
    @Param('id') postId: string,
    @Body(ValidationPipe) dto: CreateCommentDto,
  ) {
    return await this.newsfeedService.createComment(profile.id, postId, dto);
  }
}
