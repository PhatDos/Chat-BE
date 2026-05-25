import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { SummaryTone } from '~/generated/prisma/client';

interface Flashcard {
  front_text: string;
  back_text: string;
}

interface QuizQuestion {
  question_text: string;
  options: Array<{
    option_text: string;
    is_correct: boolean;
  }>;
  explanation: string;
}

@Injectable()
export class AiGenerationService {
  private readonly logger = new Logger(AiGenerationService.name);

  constructor(private aiService: AiService) {}

  /**
   * Generate summary from text content
   */
  async generateSummary(
    text: string,
    tone: SummaryTone = SummaryTone.CONCISE,
  ): Promise<string> {
    const toneInstructions = {
      [SummaryTone.CONCISE]:
        'Create a brief, concise summary highlighting only the key points.',
      [SummaryTone.DETAILED]:
        'Create a comprehensive, detailed summary covering all important aspects.',
      [SummaryTone.SIMPLE]:
        'Create a simple, easy-to-understand summary suitable for beginners.',
      [SummaryTone.ACADEMIC]:
        'Create an academic-style summary with formal language and structure.',
    };

    const prompt = `${toneInstructions[tone] || toneInstructions[SummaryTone.CONCISE]}

Format the summary in markdown with:
- Clear headings (##)
- Bullet points for key concepts
- Bold for important terms

Text to summarize:
${text.substring(0, 12000)}`;

    try {
      const systemPrompt = 'You are an expert educational content summarizer. Create clear, well-structured summaries in markdown format.';
      const fullPrompt = `${systemPrompt}\n\n${prompt}`;

      const result = await this.aiService.generateContent(fullPrompt, {
        temperature: 0.7,
        maxTokens: 1500,
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error generating summary: ${message}`);
      throw error;
    }
  }

  /**
   * Generate flashcards from text content
   */
  async generateFlashcards(
    text: string,
    count: number = 10,
  ): Promise<Flashcard[]> {
    const prompt = `Create ${count} educational flashcards from the following content. 
Each flashcard should have a clear question (front) and a concise answer (back).
Focus on key concepts, definitions, and important facts.

Return the flashcards as a JSON array with this structure:
[
  {
    "front_text": "Question or term",
    "back_text": "Answer or definition"
  }
]

IMPORTANT: Return ONLY the JSON array, no additional text or markdown formatting.

Content:
${text.substring(0, 10000)}`;

    try {
      const systemPrompt = 'You are an expert at creating educational flashcards. Return only valid JSON array, no markdown code blocks or additional text.';
      const fullPrompt = `${systemPrompt}\n\n${prompt}`;

      const response = await this.aiService.generateContent(fullPrompt, {
        temperature: 0.8,
        maxTokens: 2000,
      });

      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Invalid response format');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error generating flashcards: ${message}`);
      throw error;
    }
  }

  /**
   * Generate quiz from text content
   */
  async generateQuiz(
    text: string,
    questionCount: number = 5,
  ): Promise<{ questions: QuizQuestion[] }> {
    const prompt = `Create a ${questionCount}-question multiple choice quiz from the following content.
Each question should have:
- A clear question text
- 4 options (A, B, C, D)
- One correct answer
- An explanation for the correct answer

Return as JSON with this structure:
{
  "questions": [
    {
      "question_text": "Question here?",
      "options": [
        {"option_text": "Option A", "is_correct": false},
        {"option_text": "Option B", "is_correct": true},
        {"option_text": "Option C", "is_correct": false},
        {"option_text": "Option D", "is_correct": false}
      ],
      "explanation": "Explanation of the correct answer"
    }
  ]
}

IMPORTANT: Return ONLY the JSON object, no additional text or markdown formatting.

Content:
${text.substring(0, 10000)}`;

    try {
      const systemPrompt = 'You are an expert at creating educational quizzes. Return only valid JSON object, no markdown code blocks or additional text.';
      const fullPrompt = `${systemPrompt}\n\n${prompt}`;

      const response = await this.aiService.generateContent(fullPrompt, {
        temperature: 0.8,
        maxTokens: 2500,
      });

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error generating quiz: ${message}`);
      throw error;
    }
  }
}
