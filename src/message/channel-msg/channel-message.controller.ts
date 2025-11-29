import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ChannelMessageService } from './channel-message.service';

@Controller('channel-message')
export class ChannelMessageController {
  constructor(private readonly channelMessageService: ChannelMessageService) {}

  @Post()
  create(@Body() createChannelMessageDto: Prisma.MessageCreateInput) {
    return this.channelMessageService.create(createChannelMessageDto);
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
}
