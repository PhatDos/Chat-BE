import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { DirectMessageService } from './direct-message.service';
import {
  CreateDirectMessageDto,
  UpdateDirectMessageDto,
} from './direct-message.dto';

@Controller('direct-message')
export class DirectMessageController {
  constructor(private readonly directMessageService: DirectMessageService) {}

  // CREATE MESSAGE
  @Post()
  create(@Body() dto: CreateDirectMessageDto) {
    return this.directMessageService.create(dto);
  }

  // GET MESSAGES WITH PAGINATION
  @Get()
  getMessages(
    @Query('conversationId') conversationId: string,
    @Query('cursor') cursor?: string,
  ) {
    if (!conversationId) {
      throw new BadRequestException('conversationId is required');
    }

    return this.directMessageService.getMessages(conversationId, cursor);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.directMessageService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDirectMessageDto) {
    return this.directMessageService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.directMessageService.delete(id);
  }
}
