import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '~/prisma/prisma.service';
import { AiGenerationService } from '~/ai-generation/ai-generation.service';
import { FileExtractionService } from '~/ai-generation/file-extraction.service';
import { CreateLectureDto } from './dto/create-lecture.dto';
import { GenerateSummaryDto } from './dto/generate-summary.dto';
import { GenerateFlashcardsDto } from './dto/generate-flashcards.dto';
import { GenerateQuizDto } from './dto/generate-quiz.dto';
import { SummaryTone } from '@prisma/client';

@Injectable()
export class LectureService {
  private readonly logger = new Logger(LectureService.name);

  constructor(
    private prisma: PrismaService,
    private aiGeneration: AiGenerationService,
    private fileExtraction: FileExtractionService,
  ) {}

  /**
   * Create a new lecture with extracted content
   */
  async createLecture(createLectureDto: CreateLectureDto) {
    try {
      // Extract text from file
      const extractedContent = await this.fileExtraction.extractText(
        createLectureDto.fileUrl,
        createLectureDto.fileType,
      );

      console.log(extractedContent.slice(0, 500));

      if (!extractedContent || extractedContent.trim().length === 0) {
        throw new BadRequestException('Could not extract content from file');
      }

      // Create lecture
      const lecture = await this.prisma.lecture.create({
        data: {
          title: createLectureDto.title,
          fileUrl: createLectureDto.fileUrl,
          fileType: createLectureDto.fileType,
          extractedContent: extractedContent.substring(0, 100000), // Limit size
          channelId: createLectureDto.channelId,
          memberId: createLectureDto.memberId,
        },
        include: {
          summaries: true,
          flashcards: true,
          quizzes: true,
        },
      });

      return {
        success: true,
        lecture,
        message: 'Lecture created successfully',
      };
    } catch (error) {
      this.logger.error(`Error creating lecture: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get lecture by ID
   */
  async getLectureById(lectureId: string) {
    const lecture = await this.prisma.lecture.findUnique({
      where: { id: lectureId },
      include: {
        summaries: true,
        flashcards: true,
        quizzes: {
          include: {
            questions: {
              include: {
                options: true,
              },
            },
            attempts: true,
          },
        },
      },
    });

    if (!lecture) {
      throw new NotFoundException('Lecture not found');
    }

    return lecture;
  }

  /**
   * Get all lectures by channel
   */
  async getLecturesByChannel(channelId: string) {
    const lectures = await this.prisma.lecture.findMany({
      where: { channelId },
      include: {
        summaries: true,
        flashcards: true,
        quizzes: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return lectures;
  }

  /**
   * Generate summary for lecture
   */
  async generateSummary(lectureId: string, dto: GenerateSummaryDto) {
    const lecture = await this.getLectureById(lectureId);

    if (!lecture.extractedContent) {
      throw new BadRequestException('Cannot generate summary: no extracted content');
    }

    try {
      // Generate summary using AI
      const contentMarkdown = await this.aiGeneration.generateSummary(
        lecture.extractedContent,
        dto.tone || SummaryTone.CONCISE,
      );

      // Save to database
      const summary = await this.prisma.summary.create({
        data: {
          lectureId,
          tone: dto.tone || SummaryTone.CONCISE,
          contentMarkdown,
        },
      });

      return {
        success: true,
        summary,
        message: 'Summary generated successfully',
      };
    } catch (error) {
      this.logger.error(`Error generating summary: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate flashcards for lecture
   */
  async generateFlashcards(lectureId: string, dto: GenerateFlashcardsDto) {
    const lecture = await this.getLectureById(lectureId);

    if (!lecture.extractedContent) {
      throw new BadRequestException('Cannot generate flashcards: no extracted content');
    }

    try {
      // Generate flashcards using AI
      const flashcardsData = await this.aiGeneration.generateFlashcards(
        lecture.extractedContent,
        dto.count || 10,
      );

      // Save to database
      const flashcards = await Promise.all(
        flashcardsData.map((card) =>
          this.prisma.flashcard.create({
            data: {
              lectureId,
              frontText: card.front_text,
              backText: card.back_text,
            },
          }),
        ),
      );

      return {
        success: true,
        count: flashcards.length,
        flashcards,
        message: `Generated ${flashcards.length} flashcards`,
      };
    } catch (error) {
      this.logger.error(`Error generating flashcards: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate quiz for lecture
   */
  async generateQuiz(lectureId: string, dto: GenerateQuizDto) {
    const lecture = await this.getLectureById(lectureId);

    if (!lecture.extractedContent) {
      throw new BadRequestException('Cannot generate quiz: no extracted content');
    }

    try {
      // Generate quiz using AI
      const quizData = await this.aiGeneration.generateQuiz(
        lecture.extractedContent,
        dto.questionCount || 5,
      );

      // Save quiz
      const quiz = await this.prisma.quiz.create({
        data: {
          lectureId,
          title: `${lecture.title} Quiz`,
          totalQuestions: quizData.questions.length,
        },
      });

      // Save questions and options
      for (const q of quizData.questions) {
        const question = await this.prisma.quizQuestion.create({
          data: {
            quizId: quiz.id,
            questionText: q.question_text,
            explanation: q.explanation || '',
          },
        });

        await Promise.all(
          q.options.map((opt) =>
            this.prisma.quizOption.create({
              data: {
                questionId: question.id,
                optionText: opt.option_text,
                isCorrect: opt.is_correct,
              },
            }),
          ),
        );
      }

      // Return with full data
      const fullQuiz = await this.prisma.quiz.findUnique({
        where: { id: quiz.id },
        include: {
          questions: {
            include: {
              options: true,
            },
          },
        },
      });

      return {
        success: true,
        quiz: fullQuiz,
        message: `Generated quiz with ${quizData.questions.length} questions`,
      };
    } catch (error) {
      this.logger.error(`Error generating quiz: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get flashcards by lecture
   */
  async getFlashcardsByLecture(lectureId: string) {
    const flashcards = await this.prisma.flashcard.findMany({
      where: { lectureId },
      orderBy: { createdAt: 'asc' },
    });

    return flashcards;
  }

  /**
   * Get quizzes by lecture
   */
  async getQuizzesByLecture(lectureId: string) {
    const quizzes = await this.prisma.quiz.findMany({
      where: { lectureId },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
      },
    });

    return quizzes;
  }

  /**
   * Submit quiz attempt
   */
  async submitQuizAttempt(
    quizId: string,
    memberId: string,
    answers: Record<string, string>, // questionId -> optionId
  ) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // Calculate score
    let correctCount = 0;
    for (const question of quiz.questions) {
      const selectedOptionId = answers[question.id];
      const selectedOption = question.options.find((o) => o.id === selectedOptionId);

      if (selectedOption?.isCorrect) {
        correctCount++;
      }
    }

    const score = (correctCount / quiz.questions.length) * 100;

    // Save attempt
    const attempt = await this.prisma.quizAttempt.create({
      data: {
        quizId,
        memberId,
        score,
      },
    });

    return {
      success: true,
      attempt,
      score,
      correctCount,
      totalQuestions: quiz.questions.length,
    };
  }
}
