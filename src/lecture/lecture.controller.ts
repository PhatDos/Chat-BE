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

  @Post(':lectureId/generate/assessment')
  @HttpCode(HttpStatus.CREATED)
  async generateAssessment(
    @Param('lectureId') lectureId: string,
    @Body(ValidationPipe) dto: GenerateQuizDto,
    @CurrentProfile() profile: Profile,
  ) {
    return await this.lectureService.generateAssessment(lectureId, dto);
  }

  @Post(':lectureId/generate/quiz')
  @HttpCode(HttpStatus.CREATED)
  async generateQuiz(
    @Param('lectureId') lectureId: string,
    @Body(ValidationPipe) dto: GenerateQuizDto,
    @CurrentProfile() profile: Profile,
  ) {
    return await this.generateAssessment(lectureId, dto, profile);
  }

  @Post(':lectureId/assessment')
  @HttpCode(HttpStatus.CREATED)
  async createAssessment(
    @Param('lectureId') lectureId: string,
    @Body(ValidationPipe) body: any,
    @CurrentProfile() profile: Profile,
  ) {
    return await this.lectureService.createAssessment(lectureId, body);
  }

  @Patch('assessment/:assessmentId')
  @HttpCode(HttpStatus.OK)
  async updateAssessment(
    @Param('assessmentId') assessmentId: string,
    @Body(ValidationPipe) body: any,
  ) {
    return await this.lectureService.updateAssessment(assessmentId, body);
  }

  @Patch('assessment/:assessmentId/publish')
  @HttpCode(HttpStatus.OK)
  async publishAssessment(@Param('assessmentId') assessmentId: string) {
    return await this.lectureService.publishAssessment(assessmentId);
  }

  @Patch('assessment/:assessmentId/close')
  @HttpCode(HttpStatus.OK)
  async closeAssessment(@Param('assessmentId') assessmentId: string) {
    return await this.lectureService.closeAssessment(assessmentId);
  }

  @Patch('assessment/:assessmentId/archive')
  @HttpCode(HttpStatus.OK)
  async archiveAssessment(@Param('assessmentId') assessmentId: string) {
    return await this.lectureService.archiveAssessment(assessmentId);
  }

  @Post('assessment/:assessmentId/questions')
  @HttpCode(HttpStatus.CREATED)
  async addAssessmentQuestion(@Param('assessmentId') assessmentId: string, @Body(ValidationPipe) body: any) {
    return await this.lectureService.addAssessmentQuestion(assessmentId, body);
  }

  @Patch('assessment/questions/:questionId')
  @HttpCode(HttpStatus.OK)
  async updateAssessmentQuestion(@Param('questionId') questionId: string, @Body(ValidationPipe) body: any) {
    return await this.lectureService.updateAssessmentQuestion(questionId, body);
  }

  @Delete('assessment/questions/:questionId')
  @HttpCode(HttpStatus.OK)
  async deleteAssessmentQuestion(@Param('questionId') questionId: string) {
    return await this.lectureService.deleteAssessmentQuestion(questionId);
  }

  @Patch('assessment/options/:optionId')
  @HttpCode(HttpStatus.OK)
  async updateAssessmentOption(@Param('optionId') optionId: string, @Body(ValidationPipe) body: any) {
    return await this.lectureService.updateAssessmentOption(optionId, body);
  }

  @Delete('assessment/options/:optionId')
  @HttpCode(HttpStatus.OK)
  async deleteAssessmentOption(@Param('optionId') optionId: string) {
    return await this.lectureService.deleteAssessmentOption(optionId);
  }

  @Get(':lectureId/flashcards')
  @HttpCode(HttpStatus.OK)
  async getFlashcards(@Param('lectureId') lectureId: string) {
    return await this.lectureService.getFlashcardsByLecture(lectureId);
  }

  @Get(':lectureId/assessments')
  @HttpCode(HttpStatus.OK)
  async getAssessments(@Param('lectureId') lectureId: string) {
    return await this.lectureService.getAssessmentsByLecture(lectureId);
  }

  @Get(':lectureId/quizzes')
  @HttpCode(HttpStatus.OK)
  async getQuizzes(@Param('lectureId') lectureId: string) {
    return await this.getAssessments(lectureId);
  }

  @Get('assessment/:assessmentId')
  @HttpCode(HttpStatus.OK)
  async getAssessmentById(@Param('assessmentId') assessmentId: string) {
    return await this.lectureService.getAssessmentById(assessmentId);
  }

  @Get(':lectureId/assessment/:assessmentId/review')
  @HttpCode(HttpStatus.OK)
  async getAssessmentReview(@Param('assessmentId') assessmentId: string) {
    return await this.lectureService.getAssessmentReview(assessmentId);
  }

  @Get(':lectureId/quiz')
  @HttpCode(HttpStatus.OK)
  async getStudentQuiz(@Param('lectureId') lectureId: string) {
    return await this.lectureService.getStudentQuizByLecture(lectureId);
  }

  @Get('channel/:channelId/leaderboard')
  @HttpCode(HttpStatus.OK)
  async getAssessmentLeaderboard(
    @Param('channelId') channelId: string,
    @CurrentProfile() profile: Profile,
  ) {
    console.log({ path: `/lectures/channel/${channelId}/leaderboard` });

    return await this.lectureService.getAssessmentLeaderboard(channelId, profile.id, profile.userId);
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

  @Get('assessment/:assessmentId/leaderboard')
  @HttpCode(HttpStatus.OK)
  async getAssessmentLeaderboardByAssessment(
    @Param('assessmentId') assessmentId: string,
    @CurrentProfile() profile: Profile,
  ) {
    const assessment = await this.lectureService.getAssessmentById(assessmentId);

    return await this.lectureService.getAssessmentLeaderboard(assessment.channelId, profile.id, profile.userId);
  }

  @Get('assessment/:assessmentId/reveal')
  @HttpCode(HttpStatus.OK)
  async revealAssessment(@Param('assessmentId') assessmentId: string) {
    return await this.lectureService.getAssessmentById(assessmentId);
  }

  @Patch('assessment/attempts/:attemptId/grade')
  @HttpCode(HttpStatus.OK)
  async gradeAssessmentAttempt(@Param('attemptId') attemptId: string, @Body(ValidationPipe) body: any) {
    return await this.lectureService.gradeAssessmentAttempt(attemptId, body);
  }

  @Post('assessment/:assessmentId/attempt')
  @HttpCode(HttpStatus.CREATED)
  async submitAssessmentAttempt(
    @Param('assessmentId') assessmentId: string,
    @Body('memberId') memberId: string,
    @Body('answers') answers: Record<string, string>,
    @CurrentProfile() profile: Profile,
  ) {
    if (!memberId || !answers) {
      throw new BadRequestException('Member ID and answers are required');
    }
    return await this.lectureService.submitAssessmentAttempt(assessmentId, memberId, answers);
  }

  @Post('assessment/:assessmentId/attempt/start')
  @HttpCode(HttpStatus.CREATED)
  async startAssessmentAttempt(
    @Param('assessmentId') assessmentId: string,
    @Body('memberId') memberId: string,
  ) {
    if (!memberId) {
      throw new BadRequestException('Member ID is required');
    }

    return await this.lectureService.startAssessmentAttempt(assessmentId, memberId);
  }

  @Get('assessment/attempts/:attemptId')
  @HttpCode(HttpStatus.OK)
  async getAssessmentAttemptById(@Param('attemptId') attemptId: string) {
    return await this.lectureService.getAssessmentAttemptById(attemptId);
  }

  @Post('quiz/:quizId/attempt')
  @HttpCode(HttpStatus.CREATED)
  async submitQuizAttempt(
    @Param('quizId') quizId: string,
    @Body('memberId') memberId: string,
    @Body('answers') answers: Record<string, string>,
    @CurrentProfile() profile: Profile,
  ) {
    return await this.submitAssessmentAttempt(quizId, memberId, answers, profile);
  }
}
