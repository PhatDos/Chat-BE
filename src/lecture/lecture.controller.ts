import {
  Controller,
  Post,
  Get,
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

  @Get('channel/:serverId/:channelId')
  @UseGuards(ServerMemberGuard)
  @HttpCode(HttpStatus.OK)
  async getLecturesByChannel(
    @Param('serverId') serverId: string,
    @Param('channelId') channelId: string,
  ) {
    return await this.lectureService.getLecturesByChannel(serverId, channelId);
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

  @Get(':lectureId/flashcards')
  @HttpCode(HttpStatus.OK)
  async getFlashcards(@Param('lectureId') lectureId: string) {
    return await this.lectureService.getFlashcardsByLecture(lectureId);
  }

  @Get(':lectureId/quizzes')
  @HttpCode(HttpStatus.OK)
  async getQuizzes(@Param('lectureId') lectureId: string) {
    return await this.lectureService.getQuizzesByLecture(lectureId);
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
}
