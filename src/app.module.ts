import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './prisma/prisma.module';

import { MessageModule } from '~/message/message.module';
import { ServerModule } from '~/server/server.module';
import { ProfileModule } from '~/profile/profile.module';
import { ChannelModule } from '~/channel/channel.module';
import { MemberModule } from '~/member/member.module';

@Module({
  imports: [
    JwtModule.register({ secret: 'temp-secret' }), 
    PrismaModule,
    MessageModule,
    ServerModule,
    ProfileModule,
    ChannelModule,
    MemberModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
