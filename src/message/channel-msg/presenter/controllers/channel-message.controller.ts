import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  UpdateChannelMessageDto,
  UpdateChannelNotifyDto,
} from '../dtos/channel-message.dto';
import { AuthGuard } from '~/common/guards/auth.guard';
import { CurrentProfile } from '~/common/decorators/current-profile.decorator';
import type { Profile } from '~/common/types/profile.type';

import {
  GetChannelMessagesUseCase,
  FindOneChannelMessageUseCase,
  UpdateChannelMessageUseCase,
  DeleteChannelMessageUseCase,
  MarkChannelAsReadUseCase,
  UpdateChannelNotifyUseCase,
} from '../../application/usecases';

@Controller('channel-messages')
export class ChannelMessageController {
  constructor(
    private readonly getMessagesUseCase: GetChannelMessagesUseCase,
    private readonly findOneUseCase: FindOneChannelMessageUseCase,
    private readonly updateUseCase: UpdateChannelMessageUseCase,
    private readonly deleteUseCase: DeleteChannelMessageUseCase,
    private readonly markAsReadUseCase: MarkChannelAsReadUseCase,
    private readonly updateNotifyUseCase: UpdateChannelNotifyUseCase,
  ) {}

  // GET MESSAGES WITH PAGINATION
  @Get()
  getMessages(
    @Query('channelId') channelId: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.getMessagesUseCase.execute(channelId, cursor);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.findOneUseCase.execute(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateChannelMessageDto: UpdateChannelMessageDto,
  ) {
    return this.updateUseCase.execute(id, updateChannelMessageDto as any);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.deleteUseCase.execute(id);
  }

  @Post(':channelId/read')
  @UseGuards(AuthGuard)
  async markChannelAsRead(
    @Param('channelId') channelId: string,
    @Body() { serverId }: { serverId: string },
    @CurrentProfile() profile: Profile,
  ) {
    return this.markAsReadUseCase.execute(
      channelId,
      serverId,
      profile.id,
    );
  }

  @Patch(':channelId/notify')
  @UseGuards(AuthGuard)
  async updateChannelNotify(
    @Param('channelId') channelId: string,
    @Body() { serverId, isNotify }: UpdateChannelNotifyDto,
    @CurrentProfile() profile: Profile,
  ) {
    return this.updateNotifyUseCase.execute(
      channelId,
      serverId,
      profile.id,
      isNotify,
    );
  }
}
