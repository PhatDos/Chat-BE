import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './prisma/prisma.module';
import { ProfileModule } from './modules/profile/profile.module';
import { ServerModule } from './modules/server/server.module';
import { MemberModule } from './modules/member/member.module';

@Module({
  imports: [PrismaModule, ProfileModule, ServerModule, MemberModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
