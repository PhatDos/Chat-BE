import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './prisma/prisma.module';
import { ProfileModule } from '~/profile/profile.module';
import { ServerModule } from '~/server/server.module';
import { MessageModule } from '~/message/message.module';

@Module({
  imports: [
    PrismaModule,
    ProfileModule,
    ServerModule,
    MessageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
