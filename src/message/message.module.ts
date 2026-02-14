import { Module } from '@nestjs/common';
import { PrismaModule } from '~/prisma/prisma.module';

import { DirectMessageService } from './direct-msg/direct-message.service';
import { ChannelMessageService } from './channel-msg/channel-message.service';
import { NotificationService } from './notification/notification.service';

import { DirectMessageController } from './direct-msg/direct-message.controller';
import { ChannelMessageController } from './channel-msg/channel-message.controller';
import { NotificationController } from './notification/notification.controller';

import { MessageGateway } from './message.gateway';
import { DirectMessageGateway } from './direct-msg/direct-message.gateway';
import { ChannelMessageGateway } from './channel-msg/channel-message.gateway';
import { AuthGuard } from '~/common/guards/auth.guard';

@Module({
  imports: [PrismaModule],
  controllers: [
    DirectMessageController,
    ChannelMessageController,
    NotificationController,
  ],
  providers: [
    DirectMessageService,
    ChannelMessageService,
    MessageGateway,
    DirectMessageGateway,
    ChannelMessageGateway,
    NotificationService,
    AuthGuard,
  ],
  exports: [
    DirectMessageService,
    ChannelMessageService,
    ChannelMessageGateway,
    NotificationService,
  ],
})
export class MessageModule {}
