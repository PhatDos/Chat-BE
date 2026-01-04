import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '~/prisma/prisma.module';

import { DirectMessageService } from './direct-msg/direct-message.service';
import { ChannelMessageService } from './channel-msg/channel-message.service';
import { NotificationService } from './notification/notification.service';

import { DirectMessageController } from './direct-msg/direct-message.controller';
import { ChannelMessageController } from './channel-msg/channel-message.controller';
import { NotificationController } from './notification/notification.controller';

import { MessageGateway } from './message.gateway';
import { AuthGuard } from '~/common/guards/auth.guard';

@Module({
  imports: [
    JwtModule.register({ secret: 'temp-secret' }),
    PrismaModule,
  ],
  controllers: [
    DirectMessageController,
    ChannelMessageController,
    NotificationController,
  ],
  providers: [
    DirectMessageService,
    ChannelMessageService,
    MessageGateway,
    NotificationService,
    AuthGuard,
  ],
  exports: [DirectMessageService, ChannelMessageService, NotificationService],
})
export class MessageModule {}
