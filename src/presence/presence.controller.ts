import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiResponse } from '~/common/bases/api-response';
import { GetPresenceDto } from './dto/get-presence.dto';
import { PingPresenceDto } from './dto/ping-presence.dto';
import { PresenceService } from './presence.service';

@Controller('presence')
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async getPresence(@Body() body: GetPresenceDto) {
    const data = await this.presenceService.getPresence(body?.profileIds ?? []);
    return ApiResponse.ok(data, 'Presence retrieved', HttpStatus.OK);
  }

  @Post('ping')
  @HttpCode(HttpStatus.OK)
  async ping(@Body() body: PingPresenceDto) {
    const result = await this.presenceService.ping(body?.profileId);
    return ApiResponse.ok(result, 'Ping recorded', HttpStatus.OK);
  }
}
