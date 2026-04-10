import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { MODERATION_RESULT_CHANNEL } from '~/redis/moderation.queue';
import { ChannelMessageGateway } from '../../../presenter/gateways/channel-message.gateway';

@Injectable()
export class ChannelModerationRealtimeHandler
  implements OnModuleInit, OnModuleDestroy
{
  private subscriber?: Redis;

  constructor(private readonly gateway: ChannelMessageGateway) {}

  async onModuleInit() {
    if (!process.env.REDIS_URL) {
      return;
    }

    this.subscriber = new Redis(process.env.REDIS_URL);
    await this.subscriber.subscribe(MODERATION_RESULT_CHANNEL);

    this.subscriber.on('message', (channel, payload) => {
      if (channel !== MODERATION_RESULT_CHANNEL) {
        return;
      }

      try {
        const parsed = JSON.parse(payload) as {
          message?: Record<string, unknown>;
          channelId?: string;
        };

        if (!parsed.message || typeof parsed.channelId !== 'string') {
          return;
        }

        this.gateway.emitMessageUpdated(parsed.message);
      } catch (error) {
        console.error('Failed to parse moderation realtime payload:', error);
      }
    });
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.quit();
    }
  }
}