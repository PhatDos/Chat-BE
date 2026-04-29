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

const DEFAULT_PAGE_SIZE = 20;

const authorLiteSelect = {
  id: true,
  name: true,
  imageUrl: true,
} satisfies Prisma.ProfileSelect;

const postBaseSelect = {
  id: true,
  content: true,
  fileUrl: true,
  fileType: true,
  visibility: true,
  createdAt: true,
  likeCount: true,
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
  constructor(private readonly prisma: PrismaService) {}

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

  async getFollowingIds(profileId: string) {
    const rows = await this.prisma.follow.findMany({
      where: { followerId: profileId },
      select: { followingId: true },
    });

    return rows.map((row) => row.followingId);
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

    return {
      ...post,
      isLiked: false,
    };
  }

  async getUserPosts(currentProfileId: string, targetUserId: string, cursor?: string) {
    await this.getCurrentUser(currentProfileId);

    const cursorDate = this.parseCursor(cursor);

    const visibilityCondition: Prisma.PostWhereInput =
      currentProfileId === targetUserId
        ? {}
        : {
            visibility: PostVisibility.PUBLIC,
          };

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
    const followingIds = await this.getFollowingIds(profileId);

    const posts = await this.prisma.post.findMany({
      where: {
        deleted: false,
        OR: [
          { authorId: profileId },
          {
            authorId: { in: followingIds.length ? followingIds : [''] },
            visibility: { in: [PostVisibility.FRIENDS, PostVisibility.PUBLIC] },
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
        posts.length === take ? posts[posts.length - 1].createdAt.toISOString() : null,
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
      },
    });

    if (!post || post.deleted) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId === profileId) {
      return;
    }

    if (post.visibility === PostVisibility.PUBLIC) {
      return;
    }

    if (post.visibility === PostVisibility.FRIENDS) {
      const follow = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: profileId,
            followingId: post.authorId,
          },
        },
      });

      if (follow) {
        return;
      }
    }

    throw new ForbiddenException('You cannot interact with this post');
  }

  async likePost(profileId: string, postId: string) {
    await this.getCurrentUser(profileId);
    await this.ensureCanInteractWithPost(postId, profileId);

    const result = await this.prisma.$transaction(async (tx) => {
      const existingLike = await tx.like.findUnique({
        where: {
          userId_postId: {
            userId: profileId,
            postId,
          },
        },
      });

      if (existingLike) {
        return { liked: true };
      }

      await tx.like.create({
        data: {
          userId: profileId,
          postId,
        },
      });

      await tx.post.update({
        where: { id: postId },
        data: {
          likeCount: {
            increment: 1,
          },
        },
      });

      return { liked: true };
    });

    return result;
  }

  async unlikePost(profileId: string, postId: string) {
    await this.getCurrentUser(profileId);
    await this.ensureCanInteractWithPost(postId, profileId);

    const result = await this.prisma.$transaction(async (tx) => {
      const existingLike = await tx.like.findUnique({
        where: {
          userId_postId: {
            userId: profileId,
            postId,
          },
        },
      });

      if (!existingLike) {
        return { liked: false };
      }

      await tx.like.delete({
        where: {
          userId_postId: {
            userId: profileId,
            postId,
          },
        },
      });

      await tx.post.update({
        where: { id: postId },
        data: {
          likeCount: {
            decrement: 1,
          },
        },
      });

      return { liked: false };
    });

    return result;
  }

  async followUser(profileId: string, targetProfileId: string) {
    await this.getCurrentUser(profileId);
    await this.getCurrentUser(targetProfileId);

    if (profileId === targetProfileId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    await this.prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId: profileId,
          followingId: targetProfileId,
        },
      },
      update: {},
      create: {
        followerId: profileId,
        followingId: targetProfileId,
      },
    });

    return { following: true };
  }

  async unfollowUser(profileId: string, targetProfileId: string) {
    await this.getCurrentUser(profileId);

    if (profileId === targetProfileId) {
      throw new BadRequestException('Cannot unfollow yourself');
    }

    await this.prisma.follow.deleteMany({
      where: {
        followerId: profileId,
        followingId: targetProfileId,
      },
    });

    return { following: false };
  }

  async getMyFollowing(profileId: string) {
    await this.getCurrentUser(profileId);

    const following = await this.prisma.follow.findMany({
      where: { followerId: profileId },
      orderBy: { createdAt: 'desc' },
      select: { following: { select: profileLiteSelect } },
    });

    return following.map((item) => item.following);
  }

  async getFollowers(
    currentProfileId: string,
    targetProfileId: string,
    cursor?: string,
    limit = DEFAULT_PAGE_SIZE,
  ) {
    await this.getCurrentUser(currentProfileId);
    await this.getCurrentUser(targetProfileId);

    const cursorDate = this.parseCursor(cursor);
    const take = Math.min(limit, DEFAULT_PAGE_SIZE);

    const followers = await this.prisma.follow.findMany({
      where: {
        followingId: targetProfileId,
        ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      select: {
        createdAt: true,
        follower: {
          select: profileLiteSelect,
        },
      },
    });

    const currentFollowingIds = new Set(await this.getFollowingIds(currentProfileId));

    return {
      items: followers.map((item) => ({
        ...item.follower,
        isFollowingBack: currentFollowingIds.has(item.follower.id),
        followedAt: item.createdAt,
      })),
      nextCursor:
        followers.length === take
          ? followers[followers.length - 1].createdAt.toISOString()
          : null,
    };
  }
}
