import { BadRequestException, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RedisService } from '~/redis/redis.service';
import { EventEmitter } from 'events';
import Redis from 'ioredis';

export const PRESENCE_TTL_SECONDS = 65;
export const PRESENCE_KEY_PREFIX = 'presence:';

export type PresenceMap = Record<string, boolean>;

@Injectable()
export class PresenceService implements OnModuleInit, OnModuleDestroy {
  private subscriberClient?: Redis;
  readonly events = new EventEmitter();

  constructor(private readonly redisService: RedisService) {}

  async ping(
    profileId: unknown,
  ): Promise<{ profileId: string; isOnline: true; isStatusChanged: boolean }> {
    const normalizedProfileId = this.normalizeProfileId(profileId);
    const key = this.getPresenceKey(normalizedProfileId);

    const exists = await this.redisService.getClient().exists(key);

    await this.redisService
      .getClient()
      .set(key, 'online', 'EX', PRESENCE_TTL_SECONDS);

    return {
      profileId: normalizedProfileId,
      isOnline: true,
      isStatusChanged: exists === 0,
    };
  }

  async isOnline(profileId: unknown): Promise<boolean> {
    const normalizedProfileId = this.normalizeProfileId(profileId);
    const exists = await this.redisService
      .getClient()
      .exists(this.getPresenceKey(normalizedProfileId));

    return exists === 1;
  }

  async getPresence(profileIds: string[]): Promise<PresenceMap> {
    const uniqueProfileIds = [
      ...new Set(
        profileIds
          .map((profileId) => profileId.trim())
          .filter((profileId) => profileId.length > 0),
      ),
    ];

    if (uniqueProfileIds.length === 0) {
      return {};
    }

    const keys = uniqueProfileIds.map((profileId) =>
      this.getPresenceKey(profileId),
    );
    const values = await this.redisService.getClient().mget(...keys);

    return uniqueProfileIds.reduce<PresenceMap>(
      (presence, profileId, index) => {
        presence[profileId] = values[index] !== null;
        return presence;
      },
      {},
    );
  }

  async onModuleInit() {
    try {
      // Ensure Redis is configured to emit keyevent notifications for expirations
      try {
        await this.redisService.getClient().config('SET', 'notify-keyspace-events', 'Ex');
      } catch (err) {
        // If CONFIG SET fails (e.g. managed Redis), continue — users can configure externally.
        console.warn('Could not set notify-keyspace-events on Redis:', (err as any)?.message ?? err);
      }

      // Create a dedicated subscriber to listen for expired key events
      this.subscriberClient = this.redisService.getClient().duplicate();
      this.subscriberClient.on('error', (err) => {
        console.error('Redis subscriber error', err);
      });

      await this.subscriberClient.connect();

      // Subscribe to expired key events for all DBs
      await this.subscriberClient.psubscribe('__keyevent@*__:expired');

      // pmessage is used for pattern subscriptions
      (this.subscriberClient as any).on('pmessage', (_pattern: string, _channel: string, message: string) => {
        if (!message) return;
        if (!message.startsWith(PRESENCE_KEY_PREFIX)) return;

        const profileId = message.slice(PRESENCE_KEY_PREFIX.length);
        // emit a simple event that other parts of the app can listen to
        this.events.emit('expired', profileId);
      });
    } catch (err) {
      console.warn('PresenceService failed to initialize Redis keyspace listener', (err as any)?.message ?? err);
    }
  }

  async onModuleDestroy() {
    try {
      if (this.subscriberClient) {
        try {
          await this.subscriberClient.punsubscribe('__keyevent@*__:expired');
        } catch (_) {}
        try {
          await this.subscriberClient.quit();
        } catch (_) {}
      }
    } catch (err) {
      // ignore
    }
  }

  onExpired(listener: (profileId: string) => void) {
    this.events.on('expired', listener);
  }

  private getPresenceKey(profileId: string): string {
    return `${PRESENCE_KEY_PREFIX}${profileId}`;
  }

  private normalizeProfileId(profileId: unknown): string {
    if (typeof profileId !== 'string' || profileId.trim().length === 0) {
      throw new BadRequestException('profileId is required');
    }

    return profileId.trim();
  }
}
