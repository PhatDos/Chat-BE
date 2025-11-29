import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './prisma/prisma.module';
import { ProfileModule } from '~/profile/profile.module';
import { ServerModule } from '~/server/server.module';
import { MemberModule } from '~/member/member.module';
import { MessageModule } from '~/message/message.module';
import { ConversationModule } from './conversation/conversation.module';

@Module({
  imports: [
    PrismaModule,
    ProfileModule,
    ServerModule,
    MemberModule,
    MessageModule,
    ConversationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
