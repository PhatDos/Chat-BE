import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './prisma/prisma.module';

import { MessageModule } from '~/message/message.module';
import { ServerModule } from '~/server/server.module';
import { ProfileModule } from '~/profile/profile.module';
import { ChannelModule } from '~/channel/channel.module';
import { MemberModule } from '~/member/member.module';
import { NewsfeedModule } from '~/newsfeed/newsfeed.module';
import { FriendshipModule } from '~/friendship/friendship.module';
import { PresenceModule } from '~/presence/presence.module';
import { UsersModule } from '~/users/users.module';

import { AuthGuard } from '~/common/guards/auth.guard';
import { ProfileGuard } from '~/common/guards/profile.guard';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    PresenceModule,
    MessageModule,
    ServerModule,
    ProfileModule,
    UsersModule,
    ChannelModule,
    MemberModule,
    NewsfeedModule,
    FriendshipModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ProfileGuard,
    },
  ],
})
export class AppModule {}
