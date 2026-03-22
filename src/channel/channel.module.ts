import { Module } from '@nestjs/common';
import { ChannelController } from './channel.controller';
import { ChannelService } from './channel.service';
import { PrismaModule } from '~/prisma/prisma.module';
import { MemberModule } from '~/member/member.module';

@Module({
  imports: [PrismaModule, MemberModule],
  controllers: [ChannelController],
  providers: [ChannelService],
  exports: [ChannelService],
})
export class ChannelModule {}
