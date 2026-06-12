import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { LectureService } from './lecture.service';
import { CreateLectureDto } from './dto/create-lecture.dto';
import { GenerateSummaryDto } from './dto/generate-summary.dto';
import { GenerateFlashcardsDto } from './dto/generate-flashcards.dto';
import { GenerateQuizDto } from './dto/generate-quiz.dto';
import { CurrentProfile } from '~/common/decorators/current-profile.decorator';
import { ServerMemberGuard } from '~/common/guards/server-member.guard';
import type { Profile } from '~/common/types/profile.type';

@Controller('lectures')
export class LectureController {
  constructor(private lectureService: LectureService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createLecture(
    @Body(ValidationPipe) createLectureDto: CreateLectureDto,
    @CurrentProfile() profile: Profile,
  ) {
    if (!createLectureDto.channelId || !createLectureDto.memberId) {
      throw new BadRequestException('Channel ID and Member ID are required');
    }
    return await this.lectureService.createLecture(createLectureDto);
  }

  @Get(':lectureId')
  @HttpCode(HttpStatus.OK)
  async getLectureById(@Param('lectureId') lectureId: string) {
    return await this.lectureService.getLectureById(lectureId);
  }

  @Get(':lectureId/files')
  @HttpCode(HttpStatus.OK)
  async getLectureFiles(@Param('lectureId') lectureId: string) {
    return await this.lectureService.getLectureFiles(lectureId);
  }

  @Post(':lectureId/generate/summary')
  @HttpCode(HttpStatus.CREATED)
  async generateSummary(
    @Param('lectureId') lectureId: string,
    @Body(ValidationPipe) dto: GenerateSummaryDto,
    @CurrentProfile() profile: Profile,
  ) {
    return await this.lectureService.generateSummary(lectureId, dto);
  }

  @Post(':lectureId/generate/flashcards')
  @HttpCode(HttpStatus.CREATED)
  async generateFlashcards(
    @Param('lectureId') lectureId: string,
    @Body(ValidationPipe) dto: GenerateFlashcardsDto,
    @CurrentProfile() profile: Profile,
  ) {
    return await this.lectureService.generateFlashcards(lectureId, dto);
  }

  @Post(':lectureId/generate/quiz')
  @HttpCode(HttpStatus.CREATED)
  async generateQuiz(
    @Param('lectureId') lectureId: string,
    @Body(ValidationPipe) dto: GenerateQuizDto,
    @CurrentProfile() profile: Profile,
  ) {
    return await this.lectureService.generateQuiz(lectureId, dto);
  }

  @Post(':lectureId/quiz')
  @HttpCode(HttpStatus.CREATED)
  async createQuiz(
    @Param('lectureId') lectureId: string,
    @Body(ValidationPipe) body: any,
    @CurrentProfile() profile: Profile,
  ) {
    return await this.lectureService.createQuiz(lectureId, body);
  }

  @Patch('quiz/:quizId')
  @HttpCode(HttpStatus.OK)
  async updateQuiz(
    @Param('quizId') quizId: string,
    @Body(ValidationPipe) body: any,
  ) {
    return await this.lectureService.updateQuiz(quizId, body);
  }

  @Patch('quiz/:quizId/publish')
  @HttpCode(HttpStatus.OK)
  async publishQuiz(@Param('quizId') quizId: string) {
    return await this.lectureService.publishQuiz(quizId);
  }

  @Patch('quiz/:quizId/close')
  @HttpCode(HttpStatus.OK)
  async closeQuiz(@Param('quizId') quizId: string) {
    return await this.lectureService.closeQuiz(quizId);
  }

  @Patch('quiz/:quizId/archive')
  @HttpCode(HttpStatus.OK)
  async archiveQuiz(@Param('quizId') quizId: string) {
    return await this.lectureService.archiveQuiz(quizId);
  }

  @Post('quiz/:quizId/questions')
  @HttpCode(HttpStatus.CREATED)
  async addQuizQuestion(@Param('quizId') quizId: string, @Body(ValidationPipe) body: any) {
    return await this.lectureService.addQuizQuestion(quizId, body);
  }

  @Patch('quiz/questions/:questionId')
  @HttpCode(HttpStatus.OK)
  async updateQuizQuestion(@Param('questionId') questionId: string, @Body(ValidationPipe) body: any) {
    return await this.lectureService.updateQuizQuestion(questionId, body);
  }

  @Delete('quiz/questions/:questionId')
  @HttpCode(HttpStatus.OK)
  async deleteQuizQuestion(@Param('questionId') questionId: string) {
    return await this.lectureService.deleteQuizQuestion(questionId);
  }

  @Patch('quiz/options/:optionId')
  @HttpCode(HttpStatus.OK)
  async updateQuizOption(@Param('optionId') optionId: string, @Body(ValidationPipe) body: any) {
    return await this.lectureService.updateQuizOption(optionId, body);
  }

  @Delete('quiz/options/:optionId')
  @HttpCode(HttpStatus.OK)
  async deleteQuizOption(@Param('optionId') optionId: string) {
    return await this.lectureService.deleteQuizOption(optionId);
  }

  @Get(':lectureId/flashcards')
  @HttpCode(HttpStatus.OK)
  async getFlashcards(@Param('lectureId') lectureId: string) {
    return await this.lectureService.getFlashcardsByLecture(lectureId);
  }

  @Get(':lectureId/quizs')
  @HttpCode(HttpStatus.OK)
  async getQuizs(@Param('lectureId') lectureId: string) {
    return await this.lectureService.getQuizsByLecture(lectureId);
  }

  @Get(':lectureId/quizzes')
  @HttpCode(HttpStatus.OK)
  async getQuizzes(@Param('lectureId') lectureId: string) {
    return await this.getQuizs(lectureId);
  }

  @Get('quiz/:quizId')
  @HttpCode(HttpStatus.OK)
  async getQuizById(@Param('quizId') quizId: string) {
    return await this.lectureService.getQuizById(quizId);
  }

  @Get(':lectureId/quiz/:quizId/review')
  @HttpCode(HttpStatus.OK)
  async getQuizReview(@Param('quizId') quizId: string) {
    return await this.lectureService.getQuizReview(quizId);
  }

  @Get(':lectureId/quiz')
  @HttpCode(HttpStatus.OK)
  async getStudentQuiz(@Param('lectureId') lectureId: string) {
    return await this.lectureService.getStudentQuizByLecture(lectureId);
  }

  @Get('channel/:channelId/leaderboard')
  @HttpCode(HttpStatus.OK)
  async getQuizLeaderboard(
    @Param('channelId') channelId: string,
    @CurrentProfile() profile: Profile,
  ) {
    console.log({ path: `/lectures/channel/${channelId}/leaderboard` });

    return await this.lectureService.getQuizLeaderboard(channelId, profile.id, profile.userId);
  }

  @Get('channel/:serverId/:channelId')
  @UseGuards(ServerMemberGuard)
  @HttpCode(HttpStatus.OK)
  async getLecturesByChannel(
    @Param('serverId') serverId: string,
    @Param('channelId') channelId: string,
  ) {
    return await this.lectureService.getLecturesByChannel(serverId, channelId);
  }

  @Get('quiz/:quizId/leaderboard')
  @HttpCode(HttpStatus.OK)
  async getQuizLeaderboardByQuiz(
    @Param('quizId') quizId: string,
    @CurrentProfile() profile: Profile,
  ) {
    const quiz = await this.lectureService.getQuizById(quizId);

    return await this.lectureService.getQuizLeaderboard(quiz.channelId, profile.id, profile.userId);
  }

  @Get('quiz/:quizId/reveal')
  @HttpCode(HttpStatus.OK)
  async revealQuiz(@Param('quizId') quizId: string) {
    return await this.lectureService.getQuizById(quizId);
  }

  @Patch('quiz/attempts/:attemptId/grade')
  @HttpCode(HttpStatus.OK)
  async gradeQuizAttempt(@Param('attemptId') attemptId: string, @Body(ValidationPipe) body: any) {
    return await this.lectureService.gradeQuizAttempt(attemptId, body);
  }

  @Post('quiz/:quizId/attempt')
  @HttpCode(HttpStatus.CREATED)
  async submitQuizAttempt(
    @Param('quizId') quizId: string,
    @Body('memberId') memberId: string,
    @Body('answers') answers: Record<string, string>,
    @CurrentProfile() profile: Profile,
  ) {
    if (!memberId || !answers) {
      throw new BadRequestException('Member ID and answers are required');
    }
    return await this.lectureService.submitQuizAttempt(quizId, memberId, answers);
  }

  @Post('quiz/:quizId/attempt/start')
  @HttpCode(HttpStatus.CREATED)
  async startQuizAttempt(
    @Param('quizId') quizId: string,
    @Body('memberId') memberId: string,
  ) {
    if (!memberId) {
      throw new BadRequestException('Member ID is required');
    }

    return await this.lectureService.startQuizAttempt(quizId, memberId);
  }

  @Get('quiz/attempts/:attemptId')
  @HttpCode(HttpStatus.OK)
  async getQuizAttemptById(@Param('attemptId') attemptId: string) {
    return await this.lectureService.getQuizAttemptById(attemptId);
  }
}
