import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  UpdateChannelMessageDto,
  UpdateChannelNotifyDto,
} from '../dtos/channel-message.dto';
import { AuthGuard } from '~/common/guards/auth.guard';
import { SkipProfileGuard } from '~/common/decorators/skip-profile-guard.decorator';
import { CurrentProfile } from '~/common/decorators/current-profile.decorator';
import type { Profile } from '~/common/types/profile.type';

import {
  GetChannelMessagesUseCase,
  SearchChannelMessagesUseCase,
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
    private readonly searchMessagesUseCase: SearchChannelMessagesUseCase,
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

  @Get('search')
  searchMessages(
    @Query('channelId') channelId: string,
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchMessagesUseCase.execute(
      channelId,
      query,
      limit ? Number(limit) : undefined,
    );
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
  @SkipProfileGuard()
  async markChannelAsRead(
    @Req() req: any,
    @Param('channelId') channelId: string,
    @Body() { serverId }: { serverId: string },
  ) {
    const userId = req.userId as string;

    const result = await this.markAsReadUseCase.executeByUserId(
      channelId,
      serverId,
      userId,
    );

    return result;
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
