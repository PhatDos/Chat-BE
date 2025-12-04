import { Controller, Get, Param } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notiService: NotificationService) {}

  @Get('server/:memberId')
  getServerUnread(@Param('memberId') memberId: string) {
    return this.notiService.getServerUnread(memberId);
  }

  @Get('conversation/:memberId')
  getConversationUnread(@Param('memberId') memberId: string) {
    return this.notiService.getConversationUnread(memberId);
  }
}
