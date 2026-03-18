import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import type { ModerationJobData } from './src/redis/queue';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error('REDIS_URL is undefined. Check your .env file.');
}

const parsedRedisUrl = new URL(redisUrl);

const connection = {
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

const prisma = new PrismaClient();

const worker = new Worker<ModerationJobData>(
  'moderation',
  async (job: Job<ModerationJobData>) => {
    const { messageId, content } = job.data;

    console.log('Scanning:', content);

    // Demo rule: replace this with real AI moderation call.
    const isToxic = content.toLowerCase().includes('ngu');

    const flagReason = isToxic ? 'Detected banned keyword: ngu' : null;

    const updatedRows = await prisma.$executeRaw`
      UPDATE "Message"
      SET
        "isFlagged" = ${isToxic},
        "flagReason" = ${flagReason},
        "updatedAt" = NOW()
      WHERE "_id" = ${messageId}
    `;

    if (!updatedRows) {
      console.warn('Message not found for moderation update:', messageId);
      return;
    }

    if (isToxic) {
      console.log('Toxic message:', messageId);
      console.log('DB updated: isFlagged=true');
    } else {
      console.log('Safe');
      console.log('DB updated: isFlagged=false');
    }
  },
  { connection },
);

worker.on('completed', (job) => {
  console.log('Done:', job.id);
});

worker.on('failed', (job, err) => {
  console.error('Failed job:', job?.id, err);
});

const shutdown = async () => {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('Moderation worker is running...');
