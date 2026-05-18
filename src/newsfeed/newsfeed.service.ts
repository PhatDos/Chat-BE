import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FileType,
  PostVisibility,
  Prisma,
  Profile as PrismaProfile,
} from '@prisma/client';
import { PrismaService } from '~/prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent } from 'rxjs';
import { filter, map, mergeMap } from 'rxjs/operators';

const DEFAULT_PAGE_SIZE = 20;

const authorLiteSelect = {
  id: true,
  name: true,
  imageUrl: true,
} satisfies Prisma.ProfileSelect;

const postBaseSelect = {
  id: true,
  authorId: true,
  content: true,
  fileUrl: true,
  fileType: true,
  visibility: true,
  createdAt: true,
  likeCount: true,
  commentCount: true,
  comments: {
    where: { deleted: false },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: {
        select: authorLiteSelect,
      },
    },
  },
  author: {
    select: authorLiteSelect,
  },
} satisfies Prisma.PostSelect;

const profileLiteSelect = {
  id: true,
  userId: true,
  name: true,
  imageUrl: true,
} satisfies Prisma.ProfileSelect;

@Injectable()
export class NewsfeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private async getCurrentUser(profileId: string) {
    const user = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        userId: true,
        name: true,
        imageUrl: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Profile not found');
    }

    return user;
  }

  private parseCursor(cursor?: string): Date | undefined {
    if (!cursor) return undefined;

    const parsed = new Date(cursor);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid cursor');
    }

    return parsed;
  }

  private async getFriendIds(profileId: string) {
    const rows = await this.prisma.friend.findMany({
      where: {
        OR: [{ userOneId: profileId }, { userTwoId: profileId }],
      },
      select: { userOneId: true, userTwoId: true },
    });

    return rows.map((row) =>
      row.userOneId === profileId ? row.userTwoId : row.userOneId,
    );
  }

  private async mapLikedState(postIds: string[], profileId: string) {
    if (postIds.length === 0) {
      return new Set<string>();
    }

    const likes = await this.prisma.like.findMany({
      where: {
        userId: profileId,
        postId: { in: postIds },
      },
      select: { postId: true },
    });

    return new Set(likes.map((like) => like.postId));
  }

  async createPost(profileId: string, dto: CreatePostDto) {
    await this.getCurrentUser(profileId);

    if (!dto.content?.trim() && !dto.fileUrl) {
      throw new BadRequestException('Post must have content or fileUrl');
    }

    const post = await this.prisma.post.create({
      data: {
        authorId: profileId,
        content: dto.content?.trim() ?? '',
        fileUrl: dto.fileUrl ?? null,
        fileType: dto.fileType ?? FileType.text,
        visibility: dto.visibility ?? PostVisibility.PUBLIC,
      },
      select: postBaseSelect,
    });

    this.eventEmitter.emit('newsfeed.event', {
      type: 'POST_CREATED',
      postId: post.id,
      authorId: post.authorId,
      visibility: post.visibility,
      actionUserId: profileId,
      post,
    });

    return {
      ...post,
      isLiked: false,
    };
  }

  async getUserPosts(
    currentProfileId: string,
    targetUserId: string,
    cursor?: string,
  ) {
    await this.getCurrentUser(currentProfileId);

    const cursorDate = this.parseCursor(cursor);

    const isSelf = currentProfileId === targetUserId;

    let visibilityCondition: Prisma.PostWhereInput = {};

    if (!isSelf) {
      // if viewer is friend of target, include FRIENDS and PUBLIC
      const friendIds = await this.getFriendIds(currentProfileId);
      const isFriend = friendIds.includes(targetUserId);

      visibilityCondition = isFriend
        ? {
            visibility: { in: [PostVisibility.PUBLIC, PostVisibility.FRIENDS] },
          }
        : { visibility: PostVisibility.PUBLIC };
    }

    const posts = await this.prisma.post.findMany({
      where: {
        authorId: targetUserId,
        deleted: false,
        ...visibilityCondition,
        ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: DEFAULT_PAGE_SIZE,
      select: postBaseSelect,
    });

    const likedPostIds = await this.mapLikedState(
      posts.map((post) => post.id),
      currentProfileId,
    );

    return {
      items: posts.map((post) => ({
        ...post,
        isLiked: likedPostIds.has(post.id),
      })),
      nextCursor:
        posts.length === DEFAULT_PAGE_SIZE
          ? posts[posts.length - 1].createdAt.toISOString()
          : null,
    };
  }

  async getFeed(profileId: string, cursor?: string, limit = DEFAULT_PAGE_SIZE) {
    await this.getCurrentUser(profileId);

    const cursorDate = this.parseCursor(cursor);
    const take = Math.min(limit, DEFAULT_PAGE_SIZE);
    const friendIds = await this.getFriendIds(profileId);

    const posts = await this.prisma.post.findMany({
      where: {
        deleted: false,
        OR: [
          { authorId: profileId },
          {
            authorId: { in: friendIds.length ? friendIds : [''] },
            visibility: PostVisibility.FRIENDS,
          },
          { visibility: PostVisibility.PUBLIC },
        ],
        ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      select: postBaseSelect,
    });

    const likedPostIds = await this.mapLikedState(
      posts.map((post) => post.id),
      profileId,
    );

    return {
      items: posts.map((post) => ({
        ...post,
        isLiked: likedPostIds.has(post.id),
      })),
      nextCursor:
        posts.length === take
          ? posts[posts.length - 1].createdAt.toISOString()
          : null,
    };
  }

  private async ensureCanInteractWithPost(postId: string, profileId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        visibility: true,
        deleted: true,
        likeCount: true,
      },
    });

    if (!post || post.deleted) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId === profileId) {
      return post;
    }

    if (post.visibility === PostVisibility.PUBLIC) {
      return post;
    }

    if (post.visibility === PostVisibility.FRIENDS) {
      const [userOneId, userTwoId] =
        profileId < post.authorId
          ? [profileId, post.authorId]
          : [post.authorId, profileId];

      const friend = await this.prisma.friend.findUnique({
        where: { userOneId_userTwoId: { userOneId, userTwoId } },
      });

      if (friend) {
        return post;
      }
    }

    throw new ForbiddenException('You cannot interact with this post');
  }

  async likePost(profileId: string, postId: string) {
    await this.getCurrentUser(profileId);
    const post = await this.ensureCanInteractWithPost(postId, profileId);

    let updatedLikeCount: number | null = null;

    try {
      const [, updatedPost] = await this.prisma.$transaction([
        this.prisma.like.create({
          data: {
            userId: profileId,
            postId,
          },
        }),
        this.prisma.post.update({
          where: { id: postId },
          data: {
            likeCount: { increment: 1 },
          },
          select: { likeCount: true },
        }),
      ]);
      updatedLikeCount = updatedPost.likeCount;
      console.log('POST_LIKED likeCount:', updatedLikeCount);
      this.eventEmitter.emit('newsfeed.event', {
        type: 'POST_LIKED',
        postId,
        authorId: post.authorId,
        visibility: post.visibility,
        actionUserId: profileId,
        likeCount: updatedLikeCount,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const current = await this.prisma.post.findUnique({
          where: { id: postId },
          select: { likeCount: true },
        });
        return { liked: true, likeCount: current?.likeCount ?? post.likeCount };
      }
      throw error;
    }

    return { liked: true, likeCount: updatedLikeCount ?? post.likeCount + 1 };
  }

  async deletePost(profileId: string, postId: string) {
    await this.getCurrentUser(profileId);

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, deleted: true },
    });

    if (!post || post.deleted) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== profileId) {
      throw new ForbiddenException('You cannot delete this post');
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: { deleted: true },
    });

    return { success: true };
  }

  async unlikePost(profileId: string, postId: string) {
    await this.getCurrentUser(profileId);
    const post = await this.ensureCanInteractWithPost(postId, profileId);

    let updatedLikeCount: number | null = null;

    try {
      const [, updatedPost] = await this.prisma.$transaction([
        this.prisma.like.delete({
          where: {
            userId_postId: {
              userId: profileId,
              postId,
            },
          },
        }),
        this.prisma.post.update({
          where: { id: postId },
          data: {
            likeCount: { decrement: 1 },
          },
          select: { likeCount: true },
        }),
      ]);
      updatedLikeCount = updatedPost.likeCount;
      console.log('POST_UNLIKED likeCount:', updatedLikeCount);
      this.eventEmitter.emit('newsfeed.event', {
        type: 'POST_UNLIKED',
        postId,
        authorId: post.authorId,
        visibility: post.visibility,
        actionUserId: profileId,
        likeCount: updatedLikeCount,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        const current = await this.prisma.post.findUnique({
          where: { id: postId },
          select: { likeCount: true },
        });
        return {
          liked: false,
          likeCount: current?.likeCount ?? post.likeCount,
        };
      }
      throw error;
    }

    return {
      liked: false,
      likeCount: updatedLikeCount ?? Math.max(0, post.likeCount - 1),
    };
  }

  async getComments(
    profileId: string,
    postId: string,
    cursor?: string,
    limit = 20,
  ) {
    await this.getCurrentUser(profileId);
    await this.ensureCanInteractWithPost(postId, profileId);

    const cursorDate = this.parseCursor(cursor);
    const take = Math.min(limit, 50);

    const comments = await this.prisma.comment.findMany({
      where: {
        postId,
        deleted: false,
        ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: {
          select: authorLiteSelect,
        },
      },
    });

    return {
      items: comments,
      nextCursor:
        comments.length === take
          ? comments[comments.length - 1].createdAt.toISOString()
          : null,
    };
  }

  async createComment(
    profileId: string,
    postId: string,
    dto: CreateCommentDto,
  ) {
    await this.getCurrentUser(profileId);
    const post = await this.ensureCanInteractWithPost(postId, profileId);

    const [comment] = await this.prisma.$transaction([
      this.prisma.comment.create({
        data: {
          content: dto.content.trim(),
          authorId: profileId,
          postId,
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: {
            select: authorLiteSelect,
          },
        },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      }),
    ]);

    this.eventEmitter.emit('newsfeed.event', {
      type: 'COMMENT_ADDED',
      postId,
      authorId: post.authorId,
      visibility: post.visibility,
      actionUserId: profileId,
      comment,
    });

    return comment;
  }

  subscribeToEvents(profileId: string): Observable<any> {
    return fromEvent(this.eventEmitter, 'newsfeed.event').pipe(
      mergeMap(async (payload: any) => {
        if (payload.visibility === PostVisibility.PUBLIC) return payload;
        if (payload.authorId === profileId) return payload;

        if (payload.visibility === PostVisibility.FRIENDS) {
          const friendIds = await this.getFriendIds(profileId);
          if (friendIds.includes(payload.authorId)) {
            return payload;
          }
        }
        return null;
      }),
      filter((payload) => payload !== null),
      map((payload) => {
        if (payload.type === 'POST_LIKED' || payload.type === 'POST_UNLIKED') {
          console.log(`🔔 SSE Sending ${payload.type} to ${profileId}:`, {
            postId: payload.postId,
            likeCount: payload.likeCount,
            actionUserId: payload.actionUserId,
          });
        }
        return { data: payload };
      }),
    );
  }
}
