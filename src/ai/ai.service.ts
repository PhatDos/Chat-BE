import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

type SummaryMessage = {
  content?: string | null;
  member?: {
    profile?: {
      name?: string | null;
    } | null;
  } | null;
};

export interface UnreadSummaryResponse {
  summary: string;
  mainTopics: string[];
  decisions: string[];
  importantQuestions: string[];
  actionItems: string[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private ai: GoogleGenAI | null = null;
  private readonly MAX_MESSAGES = 200;
  private readonly MAX_CONTENT_LENGTH = 2000;

  private getClient() {
    if (this.ai) {
      return this.ai;
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY missing');
    }

    this.ai = new GoogleGenAI({ apiKey });

    return this.ai;
  }

  async generateContent(
    prompt: string,
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<string> {
    const ai = this.getClient();

    const requestConfig: any = {
      model: 'gemini-2.5-flash',
      contents: prompt,
    };

    if (options?.temperature !== undefined || options?.maxTokens !== undefined) {
      requestConfig.generationConfig = {
        ...(options?.temperature !== undefined && { temperature: options.temperature }),
        ...(options?.maxTokens !== undefined && { maxOutputTokens: options.maxTokens }),
      };
    }

    const response = await ai.models.generateContent(requestConfig);

    return response.text ?? '';
  }

  async summarizeMessages(messages: SummaryMessage[]): Promise<UnreadSummaryResponse> {
    const emptyResponse: UnreadSummaryResponse = {
      summary: 'No unread messages 🎉',
      mainTopics: [],
      decisions: [],
      importantQuestions: [],
      actionItems: [],
    };

    let safeMessages = messages;

    if (safeMessages.length > this.MAX_MESSAGES) {
      safeMessages = safeMessages.slice(-this.MAX_MESSAGES);
    }

    const formatted = safeMessages
      .map((m) => {
        const author = m?.member?.profile?.name ?? 'Unknown';
        const content = String(m?.content ?? '').slice(
          0,
          this.MAX_CONTENT_LENGTH,
        );

        return `${author}: ${content}`;
      })
      .join('\n');

    const prompt = `
You are an assistant summarizing Discord conversations.
Return ONLY valid JSON with this structure:
{
  "summary": "Short natural-language summary of the conversation",
  "mainTopics": ["topic 1", "topic 2"],
  "decisions": ["decision 1"],
  "importantQuestions": ["question 1"],
  "actionItems": ["action item 1"]
}

Rules:
- Keep the summary concise and readable.
- Use empty arrays when a section has no items.
- Do not wrap the JSON in markdown or code fences.

Conversation:
${formatted}
    `;

    try {
      const responseText = await this.generateContent(prompt, {
        temperature: 0.2,
        maxTokens: 1200,
      });

      return this.parseUnreadSummaryResponse(responseText, emptyResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error summarizing unread messages: ${message}`);
      // Surface the error to the controller so the client can show a toast
      throw new ServiceUnavailableException(
        `AI summarization failed: ${message}`,
      );
    }
  }

  private parseUnreadSummaryResponse(
    responseText: string,
    fallback: UnreadSummaryResponse,
  ): UnreadSummaryResponse {
    const normalizedText = responseText.trim();

    if (!normalizedText) {
      return fallback;
    }

    const jsonMatch = normalizedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        ...fallback,
        summary: normalizedText,
      };
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as Partial<UnreadSummaryResponse>;

      return {
        summary:
          typeof parsed.summary === 'string' && parsed.summary.trim()
            ? parsed.summary.trim()
            : fallback.summary,
        mainTopics: this.normalizeStringArray(parsed.mainTopics),
        decisions: this.normalizeStringArray(parsed.decisions),
        importantQuestions: this.normalizeStringArray(parsed.importantQuestions),
        actionItems: this.normalizeStringArray(parsed.actionItems),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Unread summary JSON parse failed: ${message}`);

      return {
        ...fallback,
        summary: normalizedText,
      };
    }
  }

  private normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}
