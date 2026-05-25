import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

type SummaryMessage = {
  content?: string | null;
  member?: {
    profile?: {
      name?: string | null;
    } | null;
  } | null;
};

@Injectable()
export class AiService {
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

  async summarizeMessages(messages: SummaryMessage[]) {
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
            Summarize:
				- main topics
				- decisions
				- important questions
				- Write naturally like a short conversation summary
            Conversation:   
            ${formatted}
            `;

    return this.generateContent(prompt);
  }
}
