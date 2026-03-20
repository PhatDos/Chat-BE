import { Module } from '@nestjs/common';
import { ChannelController } from './channel.controller';
import { ChannelService } from './channel.service';
import { PrismaModule } from '~/prisma/prisma.module';
import { MemberModule } from '~/member/member.module';
import { MessageModule } from '~/message/message.module';

@Module({
  imports: [PrismaModule, MemberModule, MessageModule],
  controllers: [ChannelController],
  providers: [ChannelService],
  exports: [ChannelService],
})
export class ChannelModule {}
