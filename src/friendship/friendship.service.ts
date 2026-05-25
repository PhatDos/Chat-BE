import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent } from 'rxjs';
import { filter, map, mergeMap } from 'rxjs/operators';
import { PrismaService } from '~/prisma/prisma.service';
import { Prisma } from '~/generated/prisma/client';
import { FriendRequestListStatus } from './dto/list-friend-requests.query.dto';

type FriendProfileLite = {
  id: string;
  name: string;
  imageUrl: string;
};

export type FriendListItem = {
  id: string;
  profileId: string;
  name: string;
  imageUrl: string;
  isOnline: boolean;
  createdAt: Date;
};

export type FriendListResult = {
  items: FriendListItem[];
  count: number;
};

export type FriendRequestBaseItem = {
  id: string;
  fromProfileId: string;
  toProfileId: string;
  status: FriendRequestListStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type FriendRequestListItem = FriendRequestBaseItem & {
  actorProfile: FriendProfileLite;
};

export type FriendRequestListResult = {
  items: FriendRequestListItem[];
  count: number;
  skip: number;
  limit: number;
};

export type FriendRequestEventType =
  | 'FRIEND_REQUEST_CREATED'
  | 'FRIEND_REQUEST_ACCEPTED'
  | 'FRIEND_REQUEST_REJECTED'
  | 'FRIEND_REQUEST_CANCELLED'
  | 'FRIEND_REMOVED';

export type FriendRequestEventPayload = {
  type: FriendRequestEventType;
  audienceProfileId: string;
  actorProfileId: string;
  actorProfile: FriendProfileLite;
  request?: FriendRequestBaseItem;
  friendId?: string;
};

@Injectable()
export class FriendshipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private sortIds(a: string, b: string): [string, string] {
    return a < b ? [a, b] : [b, a];
  }

  private getPairKey(a: string, b: string): string {
    const [first, second] = this.sortIds(a, b);
    return `${first}:${second}`;
  }

  private toFriendRequestBaseItem(request: {
    id: string;
    senderId: string;
    receiverId: string;
    status: FriendRequestListStatus | string;
    createdAt: Date;
    updatedAt: Date;
  }): FriendRequestBaseItem {
    return {
      id: request.id,
      fromProfileId: request.senderId,
      toProfileId: request.receiverId,
      status: request.status as FriendRequestListStatus,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }

  private async getProfileLite(profileId: string): Promise<FriendProfileLite> {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        name: true,
        imageUrl: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  private emitFriendRequestEvent(payload: FriendRequestEventPayload) {
    console.log('[friendship.event] emit', payload);
    this.eventEmitter.emit('friendship.event', payload);
  }

  /* Friend request flow */
  async sendFriendRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    const receiver = await this.prisma.profile.findUnique({
      where: { id: receiverId },
      select: { id: true },
    });
    if (!receiver) {
      throw new NotFoundException('Target profile not found');
    }

    // already friends?
    const alreadyFriend = await this.isFriend(senderId, receiverId);
    if (alreadyFriend) throw new ConflictException('Already friends');

    // existing pending request either direction
    const existing = await this.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
        status: 'PENDING',
      },
    });
    if (existing) throw new ConflictException('Pending request already exists');

    const pairKey = this.getPairKey(senderId, receiverId);

    try {
      const request = await this.prisma.friendRequest.create({
        data: { senderId, receiverId, pairKey, status: 'PENDING' },
      });
      const actorProfile = await this.getProfileLite(senderId);

      this.emitFriendRequestEvent({
        type: 'FRIEND_REQUEST_CREATED',
        audienceProfileId: receiverId,
        actorProfileId: senderId,
        actorProfile,
        request: this.toFriendRequestBaseItem(request),
      });

      return request;
    } catch (e) {
      // Handles concurrent inserts violating pair uniqueness.
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Pending request already exists');
      }
      // Foreign key constraint failed (sender/receiver profile does not exist).
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2003'
      ) {
        throw new NotFoundException('Target profile not found');
      }
      throw e;
    }
  }

  async acceptFriendRequest(requestId: string, receiverId: string) {
    const req = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });
    if (!req) throw new NotFoundException('Friend request not found');
    if (req.receiverId !== receiverId) throw new ForbiddenException();

    // create friend record and delete request in transaction
    const [a, b] = this.sortIds(req.senderId, req.receiverId);
    const result = await this.prisma.$transaction([
      this.prisma.friend.create({ data: { userOneId: a, userTwoId: b } }),
      this.prisma.friendRequest.delete({ where: { id: requestId } }),
    ]);
    const actorProfile = await this.getProfileLite(receiverId);

    this.emitFriendRequestEvent({
      type: 'FRIEND_REQUEST_ACCEPTED',
      audienceProfileId: req.senderId,
      actorProfileId: receiverId,
      actorProfile,
      request: this.toFriendRequestBaseItem(req),
      friendId: result[0].id,
    });

    return result;
  }

  async rejectFriendRequest(requestId: string, receiverId: string) {
    const req = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });
    if (!req) throw new NotFoundException('Friend request not found');
    if (req.receiverId !== receiverId) throw new ForbiddenException();

    const deleted = await this.prisma.friendRequest.delete({
      where: { id: requestId },
    });
    const actorProfile = await this.getProfileLite(receiverId);

    this.emitFriendRequestEvent({
      type: 'FRIEND_REQUEST_REJECTED',
      audienceProfileId: req.senderId,
      actorProfileId: receiverId,
      actorProfile,
      request: this.toFriendRequestBaseItem(deleted),
    });

    return deleted;
  }

  async cancelFriendRequest(requestId: string, senderId: string) {
    const req = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });
    if (!req) throw new NotFoundException('Friend request not found');
    if (req.senderId !== senderId) throw new ForbiddenException();

    const deleted = await this.prisma.friendRequest.delete({
      where: { id: requestId },
    });
    const actorProfile = await this.getProfileLite(senderId);

    this.emitFriendRequestEvent({
      type: 'FRIEND_REQUEST_CANCELLED',
      audienceProfileId: req.receiverId,
      actorProfileId: senderId,
      actorProfile,
      request: this.toFriendRequestBaseItem(deleted),
    });

    return deleted;
  }

  async listReceivedRequests(profileId: string) {
    return this.listFriendRequests({
      currentProfileId: profileId,
      direction: 'received',
    });
  }

  async listSentRequests(profileId: string) {
    return this.listFriendRequests({
      currentProfileId: profileId,
      direction: 'sent',
    });
  }

  async listFriendRequests(options: {
    currentProfileId: string;
    direction: 'received' | 'sent';
    skip?: number;
    limit?: number;
    status?: FriendRequestListStatus;
  }): Promise<FriendRequestListResult> {
    const {
      currentProfileId,
      direction,
      skip = 0,
      limit = 20,
      status,
    } = options;

    const where = {
      ...(direction === 'received'
        ? { receiverId: currentProfileId }
        : { senderId: currentProfileId }),
      ...(status ? { status } : {}),
    };

    const [count, requests] = await this.prisma.$transaction([
      this.prisma.friendRequest.count({ where }),
      this.prisma.friendRequest.findMany({
        where,
        select: {
          id: true,
          senderId: true,
          receiverId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          sender: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },
          receiver: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const items: FriendRequestListItem[] = requests.map((request) => ({
      id: request.id,
      fromProfileId: request.senderId,
      toProfileId: request.receiverId,
      status: request.status as FriendRequestListStatus,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      actorProfile:
        direction === 'received' ? request.sender : request.receiver,
    }));

    return { items, count, skip, limit };
  }

  async addFriend(initiatorId: string, targetId: string) {
    if (initiatorId === targetId) {
      throw new BadRequestException('Cannot add yourself as friend');
    }

    const [userOneId, userTwoId] = this.sortIds(initiatorId, targetId);

    try {
      const friend = await this.prisma.friend.create({
        data: { userOneId, userTwoId },
      });

      return friend;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        // unique constraint failed — already friends
        throw new ConflictException('Friendship already exists');
      }
      throw e;
    }
  }

  async removeFriend(initiatorId: string, targetId: string) {
    const [userOneId, userTwoId] = this.sortIds(initiatorId, targetId);

    try {
      const friend = await this.prisma.friend.delete({
        where: {
          userOneId_userTwoId: { userOneId, userTwoId },
        },
      });
      const actorProfile = await this.getProfileLite(initiatorId);

      this.emitFriendRequestEvent({
        type: 'FRIEND_REMOVED',
        audienceProfileId: targetId,
        actorProfileId: initiatorId,
        actorProfile,
        friendId: friend.id,
      });

      return { success: true };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException('Friendship not found');
      }
      throw e;
    }
  }

  async isFriend(a: string, b: string) {
    const [userOneId, userTwoId] = this.sortIds(a, b);
    const friend = await this.prisma.friend.findUnique({
      where: { userOneId_userTwoId: { userOneId, userTwoId } },
    });
    return !!friend;
  }

  async getFriendshipInfo(viewerId: string, targetId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: targetId },
      select: { id: true, name: true, imageUrl: true },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const isFriend = await this.isFriend(viewerId, targetId);

    // Check for pending friend requests
    let pendingRequest: { id: string; direction: 'sent' | 'received' } | null =
      null;
    const request = await this.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: viewerId, receiverId: targetId },
          { senderId: targetId, receiverId: viewerId },
        ],
        status: 'PENDING',
      },
      select: { id: true, senderId: true },
    });

    if (request) {
      pendingRequest = {
        id: request.id,
        direction: request.senderId === viewerId ? 'sent' : 'received',
      };
    }

    // Determine status for UI button state
    let status: 'FRIENDS' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'NOT_FRIENDS';
    if (isFriend) {
      status = 'FRIENDS';
    } else if (pendingRequest?.direction === 'sent') {
      status = 'PENDING_SENT';
    } else if (pendingRequest?.direction === 'received') {
      status = 'PENDING_RECEIVED';
    } else {
      status = 'NOT_FRIENDS';
    }

    return {
      id: profile.id,
      name: profile.name,
      imageUrl: profile.imageUrl,
      isFriend,
      pendingRequest,
      status,
    };
  }

  subscribeToEvents(profileId: string): Observable<any> {
    return fromEvent<FriendRequestEventPayload>(
      this.eventEmitter,
      'friendship.event',
    ).pipe(
      mergeMap(async (payload: FriendRequestEventPayload) => {
        console.log('[friendship.event] raw sse payload', payload);

        if (!payload) {
          console.log(
            '[friendship.event] skipped empty payload for',
            profileId,
          );
          return null;
        }

        if (payload.audienceProfileId === profileId) {
          console.log('[friendship.event] deliver to', profileId, payload);
          return payload;
        }

        console.log(
          '[friendship.event] skip for',
          profileId,
          'audience:',
          payload.audienceProfileId,
        );

        return null;
      }),
      filter((payload) => payload !== null),
      map((payload) => ({ data: payload })),
    );
  }

  /**
   * Get all friends of a profile
   * Used by presence service to broadcast online/offline events
   */
  async getFriendsOf(profileId: string): Promise<string[]> {
    const friends = await this.prisma.friend.findMany({
      where: {
        OR: [{ userOneId: profileId }, { userTwoId: profileId }],
      },
      select: {
        userOneId: true,
        userTwoId: true,
      },
    });

    return friends.map((friend) =>
      friend.userOneId === profileId ? friend.userTwoId : friend.userOneId,
    );
  }

  /**
   * Get friend list with profile details for the current user.
   */
  async getFriendList(profileId: string): Promise<FriendListResult> {
    const where = {
      OR: [{ userOneId: profileId }, { userTwoId: profileId }],
    };

    const [count, friends] = await this.prisma.$transaction([
      this.prisma.friend.count({ where }),
      this.prisma.friend.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          userOneId: true,
          userTwoId: true,
          userOne: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              isOnline: true,
            },
          },
          userTwo: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              isOnline: true,
            },
          },
        },
      }),
    ]);

    const items: FriendListItem[] = friends.map((friend) => {
      const targetProfile =
        friend.userOneId === profileId ? friend.userTwo : friend.userOne;

      return {
        id: friend.id,
        profileId: targetProfile.id,
        name: targetProfile.name,
        imageUrl: targetProfile.imageUrl,
        isOnline: targetProfile.isOnline,
        createdAt: friend.createdAt,
      };
    });

    return { items, count };
  }
}
