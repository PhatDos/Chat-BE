import { Module } from '@nestjs/common';
import { MemberService } from './member.service';
import { MemberController } from './member.controller';
import { PrismaModule } from '~/prisma/prisma.module';
import { MessageModule } from '~/message/message.module';

@Module({
  imports: [PrismaModule, MessageModule],
  providers: [MemberService],
  controllers: [MemberController],
  exports: [MemberService],
})
export class MemberModule {}
