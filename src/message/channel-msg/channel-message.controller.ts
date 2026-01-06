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
import { Prisma } from '@prisma/client';
import { ChannelMessageService } from './channel-message.service';
import { CreateChannelMessageDto } from './channel-message.dto';
import { AuthGuard } from '~/common/guards/auth.guard';
import { CurrentProfile } from '~/common/decorators/current-profile.decorator';
import { MessageGateway } from '../message.gateway';

@Controller('channels')
export class ChannelMessageController {
  constructor(
    private readonly channelMessageService: ChannelMessageService,
    private readonly messageGateway: MessageGateway,
  ) {}

  @Post()
  create(@Body() body: CreateChannelMessageDto) {
    return this.channelMessageService.create({
      content: body.content!,
      fileUrl: body.fileUrl,
      member: { connect: { id: body.memberId } },
      channel: { connect: { id: body.channelId } },
    });
  }

  // =============================
  // GET MESSAGES WITH PAGINATION
  // =============================
  @Get()
  getMessages(
    @Query('channelId') channelId: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.channelMessageService.getMessages(channelId, cursor);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.channelMessageService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateChannelMessageDto: Prisma.MessageUpdateInput,
  ) {
    return this.channelMessageService.update(id, updateChannelMessageDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.channelMessageService.delete(id);
  }

  @Post(':channelId/read')
  @UseGuards(AuthGuard)
  async markChannelAsRead(
    @Param('channelId') channelId: string,
    @Body() { serverId }: { serverId: string },
    @CurrentProfile() profile: any,
  ) {
    const channelRead = await this.channelMessageService.markChannelAsRead(
      channelId,
      serverId,
      profile.id,
    );

    // Listen per channel (chưa dùng)
    this.messageGateway.server
      .to(`profile:${profile.id}`)
      .emit('channel:mark-read', {
        channelId,
        serverId,
        lastReadAt: channelRead.lastReadAt,
      });

    const totalUnread = await this.channelMessageService.getTotalUnreadForSpecificServer(
      serverId,
      profile.id,
    );

    this.messageGateway.server
      .to(`profile:${profile.id}`)
      .emit('server:unread-update', {
        serverId,
        // channelId,
        totalUnread,
      });

    return channelRead;
  }
}
