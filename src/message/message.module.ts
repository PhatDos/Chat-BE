import { Module } from '@nestjs/common';
import { PrismaModule } from '~/prisma/prisma.module';

import { DirectMessageService } from './direct-msg/direct-message.service';
import { ChannelMessageService } from './channel-msg/channel-message.service';

import { DirectMessageController } from './direct-msg/direct-message.controller';
import { ChannelMessageController } from './channel-msg/channel-message.controller';

import { MessageGateway } from './message.gateway';

@Module({
  imports: [PrismaModule],
  controllers: [DirectMessageController, ChannelMessageController],
  providers: [DirectMessageService, ChannelMessageService, MessageGateway],
  exports: [DirectMessageService, ChannelMessageService],
})
export class MessageModule {}
