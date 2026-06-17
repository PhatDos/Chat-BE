import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '~/prisma/prisma.module';

import { DirectMessageService } from './direct-msg/direct-message.service';
import { NotificationService } from './notification/notification.service';
import { ChannelRefetchService } from './channel-refetch.service';

import { DirectMessageController } from './direct-msg/direct-message.controller';
import { ChannelMessageController } from './channel-msg/presenter/controllers/channel-message.controller';
import { PollController } from './poll/poll.controller';
import { NotificationController } from './notification/notification.controller';

import { MessageGateway } from './message.gateway';
import { DirectMessageGateway } from './direct-msg/direct-message.gateway';
import { ChannelMessageGateway } from './channel-msg/presenter/gateways/channel-message.gateway';
import { AuthGuard } from '~/common/guards/auth.guard';
import { PollService } from './poll/poll.service';

import {
  CreateChannelMessageUseCase,
  UpdateChannelMessageUseCase,
  DeleteChannelMessageUseCase,
  GetChannelMessagesUseCase,
  SearchChannelMessagesUseCase,
  FindOneChannelMessageUseCase,
  MarkChannelAsReadUseCase,
  UpdateChannelNotifyUseCase,
  GetTotalUnreadChannelUseCase,
  FindChannelUseCase,
  FindMemberUseCase,
  GetMembersInServerUseCase,
} from './channel-msg/application/usecases';

import { PrismaChannelMessageRepository } from './channel-msg/infrastructure/repositories/prisma-channel-message.repository';
import { CHANNEL_MESSAGE_REPOSITORY } from './channel-msg/domain/repositories/channel-message.repository.interface';
import { ChannelMessageHandler } from './channel-msg/application/events/handlers/channel-message.handler';
import { ChannelModerationRealtimeHandler } from './channel-msg/application/events/handlers/channel-moderation-realtime.handler';
import { PresenceModule } from '~/presence/presence.module';

const ChannelMessageUseCases = [
  CreateChannelMessageUseCase,
  UpdateChannelMessageUseCase,
  DeleteChannelMessageUseCase,
  GetChannelMessagesUseCase,
  SearchChannelMessagesUseCase,
  FindOneChannelMessageUseCase,
  MarkChannelAsReadUseCase,
  UpdateChannelNotifyUseCase,
  GetTotalUnreadChannelUseCase,
  FindChannelUseCase,
  FindMemberUseCase,
  GetMembersInServerUseCase,
];

@Global()
@Module({
  imports: [PrismaModule, PresenceModule],
  controllers: [
    DirectMessageController,
    ChannelMessageController,
    PollController,
    NotificationController,
  ],
  providers: [
    {
      provide: CHANNEL_MESSAGE_REPOSITORY,
      useClass: PrismaChannelMessageRepository,
    },
    ChannelMessageHandler,
    ChannelModerationRealtimeHandler,
    DirectMessageService,
    ChannelRefetchService,
    MessageGateway,
    DirectMessageGateway,
    ChannelMessageGateway,
    NotificationService,
    PollService,
    AuthGuard,
    ...ChannelMessageUseCases,
  ],
  exports: [
    DirectMessageService,
    ChannelRefetchService,
    ChannelMessageGateway,
    NotificationService,
    PollService,
    ...ChannelMessageUseCases,
  ],
})
export class MessageModule {}
