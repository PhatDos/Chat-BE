import { Controller, Get, Param } from '@nestjs/common';
import { CurrentProfile } from '~/common/decorators/current-profile.decorator';
import type { Profile } from '~/common/types/profile.type';
import { AttachmentService } from './attachment.service';

@Controller()
export class AttachmentController {
  constructor(private readonly attachmentService: AttachmentService) {}

  @Get('channels/:channelId/media')
  getChannelMedia(
    @Param('channelId') channelId: string,
    @CurrentProfile() profile: Profile,
  ) {
    return this.attachmentService.getChannelMedia(channelId, profile.id);
  }

  @Get('channels/:channelId/files')
  getChannelFiles(
    @Param('channelId') channelId: string,
    @CurrentProfile() profile: Profile,
  ) {
    return this.attachmentService.getChannelFiles(channelId, profile.id);
  }

  @Get('conversations/:conversationId/media')
  getConversationMedia(
    @Param('conversationId') conversationId: string,
    @CurrentProfile() profile: Profile,
  ) {
    return this.attachmentService.getConversationMedia(
      conversationId,
      profile.id,
    );
  }

  @Get('conversations/:conversationId/files')
  getConversationFiles(
    @Param('conversationId') conversationId: string,
    @CurrentProfile() profile: Profile,
  ) {
    return this.attachmentService.getConversationFiles(
      conversationId,
      profile.id,
    );
  }
}
