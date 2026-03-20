import 'dotenv/config';
import { Queue } from 'bullmq';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error('REDIS_URL is undefined. Check your .env file.');
}

const parsedRedisUrl = new URL(redisUrl);

export const moderationConnection = {
  host: parsedRedisUrl.hostname,
  port: Number(parsedRedisUrl.port || 6379),
  username: parsedRedisUrl.username
    ? decodeURIComponent(parsedRedisUrl.username)
    : undefined,
  password: parsedRedisUrl.password
    ? decodeURIComponent(parsedRedisUrl.password)
    : undefined,
  maxRetriesPerRequest: null,
};

export const MODERATION_QUEUE_NAME = 'moderation';
export const MODERATION_JOB_NAME = 'scan-message';

export type ModerationJobData = {
  messageId: string;
  content: string;
};

export type ModerationJobName = typeof MODERATION_JOB_NAME;

export const moderationQueue = new Queue<
  ModerationJobData,
  void,
  ModerationJobName
>(MODERATION_QUEUE_NAME, {
  connection: moderationConnection,
});