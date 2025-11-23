import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './prisma/prisma.module';
import { ProfileModule } from '~/profile/profile.module';
import { ServerModule } from '~/server/server.module';
import { MemberModule } from '~/member/member.module';
import { DirectMessageModule } from './direct-message/direct-message.module';
import { MessageModule } from './message/message.module';

@Module({
  imports: [
    PrismaModule,
    ProfileModule,
    ServerModule,
    MemberModule,
    DirectMessageModule,
    MessageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
