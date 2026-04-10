import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';
import Redis from 'ioredis';
import {
  MODERATION_QUEUE_NAME,
  MODERATION_RESULT_CHANNEL,
  moderationConnection,
  type ModerationJobData,
} from '../redis/moderation.queue';
import {
  MODERATION_SCHEMA,
  fastCheck,
  getModerationPrompt,
  normalizeModerationText,
  parseModerationJson,
} from '../ai/moderation.util';

const globalForPrisma = globalThis as unknown as {
  moderationWorkerPrisma?: PrismaClient;
};

const prisma =
  globalForPrisma.moderationWorkerPrisma ??
  new PrismaClient({
    // Keep DB pool intentionally small when running with PgBouncer/Supabase poolers.
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.moderationWorkerPrisma = prisma;
}

// Initialize Gemini API
const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
  throw new Error('GEMINI_API_KEY is not defined in environment variables');
}
const geminiClient = new GoogleGenAI({ apiKey: geminiApiKey });
const redisPublisher = new Redis(process.env.REDIS_URL!);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableGeminiError(error: unknown): boolean {
  const status = (error as { status?: number; code?: number } | undefined)?.status ??
    (error as { status?: number; code?: number } | undefined)?.code;

  return status === 429 || status === 500 || status === 503;
}

async function moderateWithGemini(
  content: string,
  fileType?: 'text' | 'img' | 'pdf',
  fileUrl?: string,
  timeoutMs = 10_000,
): Promise<{ isFlagged: boolean; reason: string | null }> {
  const maxAttempts = 3;

  if (!fileType || fileType === 'text') {
    const normalizedText = normalizeModerationText(content);
    if (fastCheck(normalizedText)) {
      return { isFlagged: true, reason: 'Sensitive content detected' };
    }
  }

  const runScan = async () => {
    const parts: Array<Record<string, unknown>> = [{ text: getModerationPrompt() }];

    if (fileType === 'text' || !fileType) {
      parts.push({ text: normalizeModerationText(content) });
    } else {
      const sourceUrl = fileUrl ?? content;

      if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) {
        return { flagged: false, reason: 'missing_file_url' };
      }

      const file = await download(sourceUrl);

      if (file.buffer.length > 5 * 1024 * 1024) {
        return { flagged: false, reason: 'file_too_large' };
      }

      parts.push({
        inlineData: {
          data: file.buffer.toString('base64'),
          mimeType:
            fileType === 'img'
              ? file.mimeType ?? 'image/png'
              : 'application/pdf',
        },
      });
    }

    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const res = await geminiClient.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [{ role: 'user', parts }],
          config: {
            temperature: 0,
            responseMimeType: 'application/json',
            responseJsonSchema: MODERATION_SCHEMA,
          },
        });

        const text = res.text ?? '';
        if (!text.trim()) {
          return { flagged: false, reason: 'unknown' };
        }

        const parsed = parseModerationJson(text);
        return {
          flagged: parsed.flagged,
          reason: parsed.reason,
        };
      } catch (error) {
        lastError = error;

        if (!isRetryableGeminiError(error) || attempt === maxAttempts) {
          throw error;
        }

        const delayMs = 500 * 2 ** (attempt - 1);
        console.warn(
          `Gemini moderation retry ${attempt}/${maxAttempts} after ${delayMs}ms`,
          error,
        );
        await sleep(delayMs);
      }
    }

    throw lastError ?? new Error('Gemini moderation failed');
  };

  try {
    const result = await Promise.race([
      runScan(),
      new Promise<{ flagged: boolean; reason: string }>((resolve) => {
        setTimeout(
          () => resolve({ flagged: false, reason: 'unknown' }),
          timeoutMs,
        );
      }),
    ]);

    return {
      isFlagged: result.flagged,
      reason: result.reason,
    };
  } catch (error) {
    console.error('Gemini moderation error:', error);
    return { isFlagged: true, reason: 'moderation_unavailable' };
  }
}

async function download(url: string): Promise<{ buffer: Buffer; mimeType?: string }> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: response.headers.get('content-type') ?? undefined,
  };
}

const worker = new Worker<ModerationJobData>(
  MODERATION_QUEUE_NAME,
  async (job: Job<ModerationJobData>) => {
    const { messageId, content, fileType, fileUrl } = job.data;

    console.log('🔍 Scanning message:', messageId);
    console.log(
      '📝 Content:',
      content.substring(0, 100) + (content.length > 100 ? '...' : ''),
    );
    if (fileType) {
      console.log('📎 File type:', fileType);
    }

    // Call Gemini API for moderation
    const { isFlagged, reason } = await moderateWithGemini(content, fileType, fileUrl);

    // Keep field updatedAt unchanged for moderation-only updates.
    const updatedRows = await prisma.$executeRaw`
      UPDATE "Message"
      SET
        "isFlagged" = ${isFlagged},
        "flagReason" = ${reason}
      WHERE "_id" = ${messageId}
    `;

    if (!updatedRows) {
      console.warn('❌ Message not found for moderation update:', messageId);
      return;
    }

    const updatedMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: { member: { include: { profile: true } } },
    });

    if (updatedMessage) {
      await redisPublisher.publish(
        MODERATION_RESULT_CHANNEL,
        JSON.stringify({
          message: updatedMessage,
          channelId: updatedMessage.channelId,
        }),
      );
    }

    if (isFlagged) {
      console.log('⚠️  FLAGGED:', messageId);
      console.log('📋 Reason:', reason);
      console.log('💾 DB updated: isFlagged=true, flagReason=' + reason);
    } else {
      console.log('✅ SAFE:', messageId);
      console.log('💾 DB updated: isFlagged=false');
    }
  },
  { connection: moderationConnection },
);

worker.on('completed', (job) => {
  console.log('Done:', job.id);
});

worker.on('failed', (job, err) => {
  console.error('Failed job:', job?.id, err);
});

const shutdown = async () => {
  await worker.close();
  await redisPublisher.quit();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('Moderation worker is running...');