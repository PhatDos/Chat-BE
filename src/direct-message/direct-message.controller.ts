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
import { DirectMessageService } from './direct-message.service';
import { Prisma } from '@prisma/client';

@Controller('direct-message')
export class DirectMessageController {
  constructor(private readonly directMessageService: DirectMessageService) {}

  @Post()
  create(@Body() createDirectMessageDto: Prisma.DirectMessageCreateInput) {
    return this.directMessageService.create(createDirectMessageDto);
  }

  // =============================
  // GET MESSAGES WITH PAGINATION
  // =============================
  @Get()
  getMessages(
    @Query('conversationId') conversationId: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.directMessageService.getMessages(conversationId, cursor);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.directMessageService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDirectMessageDto: Prisma.DirectMessageUpdateInput,
  ) {
    return this.directMessageService.update(id, updateDirectMessageDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.directMessageService.remove(id);
  }
}
