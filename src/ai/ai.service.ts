import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

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

	async summarizeMessages(messages: any[]) {
		let safeMessages = messages;

		if (safeMessages.length > this.MAX_MESSAGES) {
			safeMessages = safeMessages.slice(-this.MAX_MESSAGES);
		}

		const formatted = safeMessages
			.map((m) => {
				const name = m?.member?.profile?.name ?? 'Unknown';
				const content = String(m?.content ?? '').slice(
					0,
					this.MAX_CONTENT_LENGTH,
				);

				return `${name}: ${content}`;
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

		const ai = this.getClient();

		const response = await ai.models.generateContent({
			model: 'gemini-2.5-flash',
			contents: prompt,
		});

		return response.text ?? '';
	}
}
