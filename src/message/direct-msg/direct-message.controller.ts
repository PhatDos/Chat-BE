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
  NotFoundException,
  UseGuards
} from '@nestjs/common';
import { DirectMessageService } from './direct-message.service';
import {
  CreateDirectMessageDto,
  UpdateDirectMessageDto,
} from './direct-message.dto';
import { CurrentProfile } from 'src/common/decorators/current-profile.decorator';
import type { Profile } from '@prisma/client';
import { AuthGuard } from '~/common/guards/auth.guard';

@Controller('direct-message')
@UseGuards(AuthGuard)
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

  @Get('conversations/list')
  async getConversationsList(@CurrentProfile() profile: Profile) {
    const conversations = await this.directMessageService.getConversationsList(profile.id);
    return { conversations };
  }

  @Post('conversations/create-or-get')
  async getOrCreateConversation(
    @Body() body: { otherProfileId: string },
    @CurrentProfile() profile: Profile,
  ) {
    // Validate otherProfile exists
    const otherProfile = await this.directMessageService.validateProfile(
      body.otherProfileId,
    );

    if (!otherProfile) {
      throw new NotFoundException('Profile not found');
    }

    const conversation = await this.directMessageService.getOrCreateConversation(
      profile.id,
      body.otherProfileId,
    );

    if (!conversation) {
      throw new BadRequestException('Failed to create conversation');
    }

    // Determine which profile is the "other" profile
    const conversationOtherProfile =
      conversation.profileOne.id === profile.id
        ? conversation.profileTwo
        : conversation.profileOne;

    return { 
      conversation,
      otherProfile: conversationOtherProfile,
    };
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
