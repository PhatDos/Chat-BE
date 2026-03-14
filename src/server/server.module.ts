import { Module } from '@nestjs/common';
import { ServerController } from './server.controller';
import { ServerService } from './server.service';
import { AuthGuard } from '~/common/guards/auth.guard';
import { PrismaModule } from '~/prisma/prisma.module';
import { ChannelModule } from '~/channel/channel.module';
import { MemberModule } from '~/member/member.module';

@Module({
  imports: [PrismaModule, ChannelModule, MemberModule],
  controllers: [ServerController],
  providers: [ServerService, AuthGuard],
})
export class ServerModule {}
