import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import {
  MODERATION_SCHEMA,
  fastCheck,
  getModerationPrompt,
  normalizeModerationText,
  parseModerationJson,
} from './moderation.util';

export interface ModerationResult {
  isFlagged: boolean;
  flagReason: string | null;
  category?: string;
}

@Injectable()
export class GeminiModerationService {
  private client: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined');
    }
    this.client = new GoogleGenAI({ apiKey });
  }

  private async runModeration(parts: Array<Record<string, unknown>>): Promise<ModerationResult> {
    const response = await this.client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts }],
      config: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseJsonSchema: MODERATION_SCHEMA,
      },
    });

    const responseText = response.text ?? '';
    if (!responseText.trim()) {
      return {
        isFlagged: false,
        flagReason: 'unknown',
      };
    }

    const result = parseModerationJson(responseText);
    return {
      isFlagged: result.flagged,
      flagReason: result.reason,
    };
  }

  async moderateText(content: string): Promise<ModerationResult> {
    try {
      const normalized = normalizeModerationText(content);
      if (fastCheck(normalized)) {
        return { isFlagged: true, flagReason: 'fast_check_keyword' };
      }

      return await this.runModeration([
        { text: getModerationPrompt() },
        { text: normalized },
      ]);
    } catch (error) {
      console.error('Gemini moderation error:', error);
      // Fail-safe: don't flag on error
      return {
        isFlagged: false,
        flagReason: 'unknown',
      };
    }
  }

  async moderateImage(imageUrl: string): Promise<ModerationResult> {
    try {
      const buffer = await this.download(imageUrl);
      if (buffer.length > 5 * 1024 * 1024) {
        return { isFlagged: false, flagReason: 'file_too_large' };
      }

      return await this.runModeration([
        { text: getModerationPrompt() },
        {
          inlineData: {
            data: buffer.toString('base64'),
            mimeType: 'image/png',
          },
        },
      ]);
    } catch (error) {
      console.error('Gemini image moderation error:', error);
      return {
        isFlagged: false,
        flagReason: 'unknown',
      };
    }
  }

  async moderatePdf(pdfUrl: string, pdfText?: string): Promise<ModerationResult> {
    try {
      const buffer = await this.download(pdfUrl);
      if (buffer.length > 5 * 1024 * 1024) {
        return { isFlagged: false, flagReason: 'file_too_large' };
      }

      return await this.runModeration([
        { text: getModerationPrompt() },
        {
          inlineData: {
            data: buffer.toString('base64'),
            mimeType: 'application/pdf',
          },
        },
      ]);
    } catch (error) {
      console.error('Gemini PDF moderation error:', error);
      return {
        isFlagged: false,
        flagReason: 'unknown',
      };
    }
  }

  private async download(url: string): Promise<Buffer> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
