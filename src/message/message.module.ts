import { Module } from '@nestjs/common';
import { PrismaModule } from '~/prisma/prisma.module';

import { DirectMessageService } from './direct-msg/direct-message.service';
import { ChannelMessageService } from './channel-msg/channel-message.service';
import { NotificationService } from './notification/notification.service';

import { DirectMessageController } from './direct-msg/direct-message.controller';
import { ChannelMessageController } from './channel-msg/channel-message.controller';
import { NotificationController } from './notification/notification.controller';

import { MessageGateway } from './message.gateway';

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
    NotificationService,
  ],
  exports: [DirectMessageService, ChannelMessageService, NotificationService],
})
export class MessageModule {}
