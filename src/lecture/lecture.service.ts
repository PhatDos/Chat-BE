import { Injectable, Logger, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
          member: {
            include: {
              profile: true,
            },
          },
          summary: true,
          flashcardSet: {
            include: {
              flashcards: {
                orderBy: { order: 'asc' },
              },
            },
          },
          assessment: true,
        },
      });

      return {
        success: true,
        lecture,
        message: 'Lecture created successfully',
      };
    } catch (error: any) {
      this.logger.error(`Error creating lecture: ${this.getErrorMessage(error)}`);
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
        member: {
          include: {
            profile: true,
          },
        },
        summary: true,
        flashcardSet: {
          include: {
            flashcards: {
              orderBy: { order: 'asc' },
            },
          },
        },
        assessment: {
          include: {
            questions: {
              include: {
                options: true,
                answers: true,
              },
            },
            attempts: {
              include: {
                answers: true,
              },
            },
          },
        },
      },
    });

    if (!lecture) {
      throw new NotFoundException('Lecture not found');
    }

    return lecture;
  }

  async getLectureFiles(lectureId: string) {
    const lecture = await this.prisma.lecture.findUnique({
      where: { id: lectureId },
      select: {
        id: true,
        title: true,
        fileUrl: true,
        fileType: true,
        createdAt: true,
        member: {
          select: {
            id: true,
            profile: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!lecture) {
      throw new NotFoundException('Lecture not found');
    }

    return [
      {
        id: lecture.id,
        title: lecture.title,
        fileUrl: lecture.fileUrl,
        fileType: lecture.fileType,
        createdAt: lecture.createdAt,
        uploadedBy: lecture.member?.profile?.name ?? 'Unknown',
      },
    ];
  }

  /**
   * Get all lectures by channel
   */
  async getLecturesByChannel(serverId: string, channelId: string) {
    const lectures = await this.prisma.lecture.findMany({
      where: { channelId },
      include: {
        member: {
          include: {
            profile: true,
          },
        },
        summary: true,
        flashcardSet: {
          include: {
            flashcards: {
              orderBy: { order: 'asc' },
            },
          },
        },
        assessment: true,
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

    // Prevent generating more than one summary per lecture
    if (lecture.summary) {
      throw new BadRequestException('Summary already exists for this lecture');
    }

    try {
      // Generate summary using AI
      const contentMarkdown = await this.aiGeneration.generateSummary(
        lecture.extractedContent,
        dto.tone || SummaryTone.CONCISE,
      );

      // Save to database
      let summary;
      try {
        summary = await this.prisma.summary.create({
          data: {
            lectureId,
            tone: dto.tone || SummaryTone.CONCISE,
            contentMarkdown,
          },
        });
      } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new BadRequestException('Summary already exists for this lecture');
        }
        throw error;
      }

      return {
        success: true,
        summary,
        message: 'Summary generated successfully',
      };
    } catch (error: any) {
      this.logger.error(`Error generating summary: ${this.getErrorMessage(error)}`);
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

    // Prevent generating flashcards more than once
    if (lecture.flashcardSet) {
      throw new BadRequestException('Flashcards already generated for this lecture');
    }

    try {
      // Generate flashcards using AI
      const flashcardsData = await this.aiGeneration.generateFlashcards(
        lecture.extractedContent,
        dto.count || 10,
      );

      // Save to database (only once)
      const flashcardSet = await this.prisma.flashcardSet.create({
        data: {
          lectureId,
          flashcards: {
            create: flashcardsData.map((card, index) => ({
              order: index + 1,
              frontText: card.front_text,
              backText: card.back_text,
            })),
          },
        },
        include: {
          flashcards: {
            orderBy: { order: 'asc' },
          },
        },
      });

      return {
        success: true,
        count: flashcardSet.flashcards.length,
        flashcardSet,
        flashcards: flashcardSet.flashcards,
        message: `Generated ${flashcardSet.flashcards.length} flashcards`,
      };
    } catch (error: any) {
      this.logger.error(`Error generating flashcards: ${this.getErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Generate quiz for lecture
   */
  async generateAssessment(lectureId: string, dto: GenerateQuizDto) {
    const lecture = await this.getLectureById(lectureId);

    if (!lecture.extractedContent) {
      throw new BadRequestException('Cannot generate assessment: no extracted content');
    }

    // Prevent generating more than one assessment/quiz per lecture
    if (lecture.assessment) {
      throw new BadRequestException('Assessment already exists for this lecture');
    }

    try {
      // Generate assessment using AI
      const assessmentData = await this.aiGeneration.generateQuiz(
        lecture.extractedContent,
        dto.questionCount || 5,
      );

      const totalPoints = assessmentData.questions.length;

      // Save assessment
      let assessment;
      try {
        assessment = await this.prisma.assessment.create({
          data: {
            lectureId,
            channelId: lecture.channelId,
            createdById: lecture.memberId,
            title: `${lecture.title} Assessment`,
            description: `AI generated assessment from ${lecture.title}`,
            type: 'QUIZ',
            generatedByAI: true,
            status: 'DRAFT',
            totalQuestions: assessmentData.questions.length,
            totalPoints,
            allowReview: true,
            allowLateSubmission: false,
          },
        });
      } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new BadRequestException('Assessment already exists for this lecture');
        }
        throw error;
      }

      // Save questions and options
      for (const [index, q] of assessmentData.questions.entries()) {
        const question = await this.prisma.assessmentQuestion.create({
          data: {
            assessmentId: assessment.id,
            order: index + 1,
            questionText: q.question_text,
            type: 'MULTIPLE_CHOICE',
            points: 1,
            explanation: q.explanation || null,
          },
        });

        await Promise.all(
          q.options.map((opt, optionIndex) =>
            this.prisma.assessmentOption.create({
              data: {
                questionId: question.id,
                order: optionIndex + 1,
                optionText: opt.option_text,
                isCorrect: opt.is_correct,
              },
            }),
          ),
        );
      }

      // Return with full data
      const fullAssessment = await this.prisma.assessment.findUnique({
        where: { id: assessment.id },
        include: {
          questions: {
            include: {
              options: true,
              answers: true,
            },
          },
          attempts: {
            include: {
              answers: true,
            },
          },
        },
      });

      return {
        success: true,
        assessment: fullAssessment,
        quiz: fullAssessment,
        message: `Generated assessment with ${assessmentData.questions.length} questions`,
      };
    } catch (error: any) {
      this.logger.error(`Error generating assessment: ${this.getErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Get flashcards by lecture
   */
  async getFlashcardsByLecture(lectureId: string) {
    const flashcardSet = await this.prisma.flashcardSet.findUnique({
      where: { lectureId },
      include: {
        flashcards: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return flashcardSet?.flashcards ?? [];
  }

  /**
   * Get quizzes by lecture
   */
  async getAssessmentsByLecture(lectureId: string) {
    const assessments = await this.prisma.assessment.findMany({
      where: { lectureId },
      include: {
        questions: {
          include: {
            options: true,
            answers: true,
          },
        },
        attempts: {
          include: {
            answers: true,
          },
        },
      },
    });

    return assessments;
  }

  async updateAssessment(
    assessmentId: string,
    data: {
      title?: string;
      description?: string | null;
      type?: 'QUIZ' | 'ASSIGNMENT';
      totalPoints?: number;
      durationMinutes?: number | null;
      allowReview?: boolean;
      allowLateSubmission?: boolean;
      expiresAt?: string | null;
      status?: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
    },
  ) {
    return this.prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.totalPoints !== undefined ? { totalPoints: data.totalPoints } : {}),
        ...(data.durationMinutes !== undefined ? { durationMinutes: data.durationMinutes } : {}),
        ...(data.allowReview !== undefined ? { allowReview: data.allowReview } : {}),
        ...(data.allowLateSubmission !== undefined ? { allowLateSubmission: data.allowLateSubmission } : {}),
        ...(data.expiresAt !== undefined ? { expiresAt: data.expiresAt ? new Date(data.expiresAt) : null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
      include: {
        questions: {
          include: {
            options: true,
            answers: true,
          },
        },
        attempts: {
          include: {
            answers: true,
          },
        },
      },
    });
  }

  async addAssessmentQuestion(
    assessmentId: string,
    data: {
      questionText: string;
      type?: 'MULTIPLE_CHOICE' | 'MULTI_SELECT' | 'TRUE_FALSE' | 'ESSAY';
      points?: number;
      explanation?: string | null;
      options?: Array<{ optionText: string; isCorrect?: boolean; order?: number }>;
      order?: number;
    },
  ) {
    const lastQuestion = await this.prisma.assessmentQuestion.findFirst({
      where: { assessmentId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const normalizedOptions = data.options
      ? this.normalizeCorrectOptions(data.options, data.type ?? 'MULTIPLE_CHOICE')
      : undefined;

    const question = await this.prisma.assessmentQuestion.create({
      data: {
        assessmentId,
        order: data.order ?? (lastQuestion?.order ?? 0) + 1,
        questionText: data.questionText,
        type: data.type ?? 'MULTIPLE_CHOICE',
        points: data.points ?? 1,
        explanation: data.explanation ?? null,
        options: normalizedOptions?.length
          ? {
              create: normalizedOptions.map((option, index) => ({
                order: option.order ?? index + 1,
                optionText: option.optionText,
                isCorrect: option.isCorrect ?? false,
              })),
            }
          : undefined,
      },
      include: {
        options: true,
        answers: true,
      },
    });

    await this.recalculateAssessmentTotals(assessmentId);

    return question;
  }

  async updateAssessmentQuestion(
    questionId: string,
    data: {
      questionText?: string;
      type?: 'MULTIPLE_CHOICE' | 'MULTI_SELECT' | 'TRUE_FALSE' | 'ESSAY';
      points?: number;
      explanation?: string | null;
      order?: number;
      options?: Array<{
        id: string;
        optionText?: string;
        isCorrect?: boolean;
        order?: number;
      }>;
    },
  ) {
    const question = await this.prisma.$transaction(async (tx) => {
      const updatedQuestion = await tx.assessmentQuestion.update({
        where: { id: questionId },
        data: {
          ...(data.questionText !== undefined ? { questionText: data.questionText } : {}),
          ...(data.type !== undefined ? { type: data.type } : {}),
          ...(data.points !== undefined ? { points: data.points } : {}),
          ...(data.explanation !== undefined ? { explanation: data.explanation } : {}),
          ...(data.order !== undefined ? { order: data.order } : {}),
        },
        include: {
          options: true,
          answers: true,
        },
      });

      if (data.options?.length) {
        const shouldKeepOnlyOneCorrect = this.isSingleCorrectAnswerQuestion(updatedQuestion.type);
        const normalizedOptions = shouldKeepOnlyOneCorrect
          ? (() => {
              let foundCorrect = false;

              return data.options!.map((option) => {
                if (!option.isCorrect) {
                  return option;
                }

                if (foundCorrect) {
                  return { ...option, isCorrect: false };
                }

                foundCorrect = true;
                return option;
              });
            })()
          : data.options;

        await Promise.all(
          normalizedOptions.map((option) =>
            tx.assessmentOption.updateMany({
              where: {
                id: option.id,
                questionId,
              },
              data: {
                ...(option.optionText !== undefined ? { optionText: option.optionText } : {}),
                ...(option.isCorrect !== undefined ? { isCorrect: option.isCorrect } : {}),
                ...(option.order !== undefined ? { order: option.order } : {}),
              },
            }),
          ),
        );

        updatedQuestion.options = await tx.assessmentOption.findMany({
          where: { questionId },
          orderBy: { order: 'asc' },
        });
      }

      if (this.isSingleCorrectAnswerQuestion(updatedQuestion.type)) {
        const correctOptions = updatedQuestion.options.filter((option) => option.isCorrect);

        if (correctOptions.length > 1) {
          const [keepOption, ...optionsToReset] = correctOptions;

          await tx.assessmentOption.updateMany({
            where: {
              id: {
                in: optionsToReset.map((option) => option.id),
              },
            },
            data: { isCorrect: false },
          });

          updatedQuestion.options = updatedQuestion.options.map((option) =>
            option.id === keepOption.id || !optionsToReset.some((resetOption) => resetOption.id === option.id)
              ? option
              : { ...option, isCorrect: false },
          );
        }
      }

      return updatedQuestion;
    });

    await this.recalculateAssessmentTotals(question.assessmentId);

    return question;
  }

  async deleteAssessmentQuestion(questionId: string) {
    const question = await this.prisma.assessmentQuestion.findUnique({
      where: { id: questionId },
      select: { assessmentId: true },
    });

    if (!question) {
      throw new NotFoundException('Assessment question not found');
    }

    await this.prisma.assessmentQuestion.delete({ where: { id: questionId } });
    await this.recalculateAssessmentTotals(question.assessmentId);

    return { success: true };
  }

  async addAssessmentOption(
    questionId: string,
    data: { optionText: string; isCorrect?: boolean; order?: number },
  ) {
    const question = await this.prisma.assessmentQuestion.findUnique({
      where: { id: questionId },
      select: { type: true },
    });

    if (!question) {
      throw new NotFoundException('Assessment question not found');
    }

    const lastOption = await this.prisma.assessmentOption.findFirst({
      where: { questionId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.assessmentOption.create({
        data: {
          questionId,
          order: data.order ?? (lastOption?.order ?? 0) + 1,
          optionText: data.optionText,
          isCorrect: data.isCorrect ?? false,
        },
      });

      if (data.isCorrect && this.isSingleCorrectAnswerQuestion(question.type)) {
        await tx.assessmentOption.updateMany({
          where: {
            questionId,
            id: { not: created.id },
          },
          data: { isCorrect: false },
        });
      }

      return created;
    });
  }

  async updateAssessmentOption(
    optionId: string,
    data: { optionText?: string; isCorrect?: boolean; order?: number },
  ) {
    const option = await this.prisma.assessmentOption.findUnique({
      where: { id: optionId },
      select: {
        questionId: true,
        question: {
          select: { type: true },
        },
      },
    });

    if (!option) {
      throw new NotFoundException('Assessment option not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.assessmentOption.update({
        where: { id: optionId },
        data: {
          ...(data.optionText !== undefined ? { optionText: data.optionText } : {}),
          ...(data.isCorrect !== undefined ? { isCorrect: data.isCorrect } : {}),
          ...(data.order !== undefined ? { order: data.order } : {}),
        },
      });

      if (data.isCorrect && this.isSingleCorrectAnswerQuestion(option.question.type)) {
        await tx.assessmentOption.updateMany({
          where: {
            questionId: option.questionId,
            id: { not: optionId },
          },
          data: { isCorrect: false },
        });
      }

      return updated;
    });
  }

  async deleteAssessmentOption(optionId: string) {
    await this.prisma.assessmentOption.delete({ where: { id: optionId } });
    return { success: true };
  }

  async publishAssessment(assessmentId: string) {
    return this.prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
      include: {
        questions: {
          include: {
            options: true,
            answers: true,
          },
        },
        attempts: {
          include: {
            answers: true,
          },
        },
      },
    });
  }

  async closeAssessment(assessmentId: string) {
    return this.prisma.assessment.update({
      where: { id: assessmentId },
      data: { status: 'CLOSED' },
    });
  }

  async archiveAssessment(assessmentId: string) {
    return this.prisma.assessment.update({
      where: { id: assessmentId },
      data: { status: 'ARCHIVED' },
    });
  }

  async getAssessmentReview(assessmentId: string) {
    return this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        questions: {
          include: {
            options: true,
            answers: true,
          },
        },
        attempts: {
          include: {
            answers: true,
            member: {
              include: { profile: true },
            },
          },
        },
      },
    });
  }

  async gradeAssessmentAttempt(
    attemptId: string,
    data: {
      teacherAdjustment?: number;
      teacherComment?: string | null;
      answers?: Array<{
        answerId: string;
        teacherAdjustedPoints?: number;
        teacherFeedback?: string | null;
      }>;
      gradedById?: string;
      status?: 'GRADED' | 'RETURNED' | 'GRADING';
    },
  ) {
    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        assessment: true,
        answers: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException('Assessment attempt not found');
    }

    const answerUpdates = data.answers || [];
    for (const answer of answerUpdates) {
      await this.prisma.assessmentAnswer.update({
        where: { id: answer.answerId },
        data: {
          ...(answer.teacherAdjustedPoints !== undefined ? { teacherAdjustedPoints: answer.teacherAdjustedPoints } : {}),
          ...(answer.teacherFeedback !== undefined ? { teacherFeedback: answer.teacherFeedback } : {}),
          gradedAt: new Date(),
        },
      });
    }

    const refreshed = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: { answers: true },
    });

    const teacherAdjustment = data.teacherAdjustment ?? 0;
    const finalScore = (refreshed?.autoScore ?? attempt.autoScore) + teacherAdjustment;

    return this.prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        teacherAdjustment,
        teacherComment: data.teacherComment ?? undefined,
        gradedById: data.gradedById,
        gradedAt: new Date(),
        status: data.status ?? 'GRADED',
        finalScore,
      },
      include: {
        answers: true,
        assessment: true,
        member: {
          include: { profile: true },
        },
      },
    });
  }

  async getAssessmentLeaderboard(channelId: string, assessmentId?: string) {
    const assessments = await this.prisma.assessment.findMany({
      where: {
        channelId,
        ...(assessmentId ? { id: assessmentId } : {}),
      },
      select: { id: true },
    });

    const assessmentIds = assessments.map((assessment) => assessment.id);

    return this.prisma.assessmentAttempt.findMany({
      where: { assessmentId: { in: assessmentIds } },
      orderBy: [{ finalScore: 'desc' }, { createdAt: 'asc' }],
      include: {
        assessment: true,
        member: {
          include: { profile: true },
        },
      },
    });
  }

  async getAssessmentById(assessmentId: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        questions: {
          include: {
            options: true,
            answers: true,
          },
        },
        attempts: {
          include: {
            answers: true,
            member: {
              include: { profile: true },
            },
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    return assessment;
  }

  private async recalculateAssessmentTotals(assessmentId: string) {
    const questions = await this.prisma.assessmentQuestion.findMany({
      where: { assessmentId },
      select: { points: true },
    });

    const totalPoints = questions.reduce((sum, question) => sum + question.points, 0);

    await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        totalQuestions: questions.length,
        totalPoints,
      },
    });
  }

  private isSingleCorrectAnswerQuestion(type: 'MULTIPLE_CHOICE' | 'MULTI_SELECT' | 'TRUE_FALSE' | 'ESSAY') {
    return type === 'MULTIPLE_CHOICE' || type === 'TRUE_FALSE';
  }

  private normalizeCorrectOptions(
    options: Array<{ optionText: string; isCorrect?: boolean; order?: number }>,
    type: 'MULTIPLE_CHOICE' | 'MULTI_SELECT' | 'TRUE_FALSE' | 'ESSAY',
  ) {
    if (!this.isSingleCorrectAnswerQuestion(type)) {
      return options;
    }

    let hasKeptCorrectOption = false;

    return options.map((option) => {
      if (option.isCorrect && !hasKeptCorrectOption) {
        hasKeptCorrectOption = true;
        return option;
      }

      return {
        ...option,
        isCorrect: false,
      };
    });
  }

  /**
   * Submit assessment attempt
   */
  async submitAssessmentAttempt(
    assessmentId: string,
    memberId: string,
    answers: Record<string, string>, // questionId -> optionId
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    const existingAttempt = await this.prisma.assessmentAttempt.findFirst({
      where: {
        assessmentId,
        memberId,
      },
      select: { id: true },
    });

    if (existingAttempt) {
      throw new ConflictException('Assessment attempt already exists for this member');
    }

    // Calculate score
    let correctCount = 0;
    let autoPoints = 0;
    const totalPoints = assessment.questions.reduce((sum, question) => sum + question.points, 0);

    const answerRows = assessment.questions.map((question) => {
      const selectedOptionId = answers[question.id];
      const selectedOption = question.options.find((o) => o.id === selectedOptionId);
      const answerText = selectedOption ? null : (selectedOptionId ?? null);
      const isCorrect = selectedOption ? selectedOption.isCorrect : null;
      const earnedPoints = selectedOption?.isCorrect ? question.points : 0;

      if (selectedOption?.isCorrect) {
        correctCount++;
        autoPoints += earnedPoints;
      }

      return {
        questionId: question.id,
        selectedOptionId: selectedOption?.id ?? null,
        answerText,
        isCorrect,
        autoPoints: earnedPoints,
        finalPoints: earnedPoints,
        questionSnapshot: {
          id: question.id,
          order: question.order,
          questionText: question.questionText,
          type: question.type,
          points: question.points,
          explanation: question.explanation,
          options: question.options.map((option) => ({
            id: option.id,
            order: option.order,
            optionText: option.optionText,
            isCorrect: option.isCorrect,
          })),
        },
      };
    });

    const score = totalPoints > 0 ? (autoPoints / totalPoints) * 100 : 0;

    // Save attempt
    let attempt;
    try {
      attempt = await this.prisma.assessmentAttempt.create({
        data: {
          assessmentId,
          memberId,
          status: 'SUBMITTED',
          submittedAt: new Date(),
          autoScore: autoPoints,
          finalScore: autoPoints,
          answers: {
            create: answerRows,
          },
        },
        include: {
          answers: true,
          assessment: {
            include: {
              questions: {
                include: {
                  options: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Assessment attempt already exists for this member');
      }

      throw error;
    }

    return {
      success: true,
      attempt,
      score,
      finalScore: autoPoints,
      correctCount,
      totalQuestions: assessment.questions.length,
      totalPoints,
    };
  }

  async getAssessmentAttemptById(attemptId: string) {
    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        assessment: {
          include: {
            questions: {
              include: {
                options: true,
              },
            },
          },
        },
        answers: true,
        member: {
          include: {
            profile: true,
          },
        },
        gradedBy: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException('Assessment attempt not found');
    }

    return attempt;
  }

  async generateQuiz(lectureId: string, dto: GenerateQuizDto) {
    return this.generateAssessment(lectureId, dto);
  }

  async getQuizzesByLecture(lectureId: string) {
    return this.getAssessmentsByLecture(lectureId);
  }

  async submitQuizAttempt(quizId: string, memberId: string, answers: Record<string, string>) {
    return this.submitAssessmentAttempt(quizId, memberId, answers);
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
