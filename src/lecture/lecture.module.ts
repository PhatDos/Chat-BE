import { Module } from '@nestjs/common';
import { LectureController } from './lecture.controller';
import { LectureService } from './lecture.service';
import { AiGenerationModule } from '~/ai-generation/ai-generation.module';
import { PrismaModule } from '~/prisma/prisma.module';
import { MemberModule } from '~/member/member.module';

@Module({
  imports: [AiGenerationModule, PrismaModule, MemberModule],
  controllers: [LectureController],
  providers: [LectureService],
  exports: [LectureService],
})
export class LectureModule {}
