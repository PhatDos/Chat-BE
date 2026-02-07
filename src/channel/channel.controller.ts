import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { ChannelService } from './channel.service';
import { CurrentProfile } from '~/common/decorators/current-profile.decorator';
import { AuthGuard } from '~/common/guards/auth.guard';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@Controller('channels')
@UseGuards(AuthGuard)
export class ChannelController {
  constructor(private channelService: ChannelService) {}

  @Get('server/:serverId')
  @HttpCode(HttpStatus.OK)
  async getChannelsByServer(
    @Param('serverId') serverId: string,
    @CurrentProfile() profile: any,
  ) {
    if (!serverId) {
      throw new BadRequestException('Server ID is required');
    }

    return await this.channelService.getChannelsByServerId(
      serverId,
      profile.id,
    );
  }

  @Get(':channelId')
  @HttpCode(HttpStatus.OK)
  async getChannelById(
    @Param('channelId') channelId: string,
    @CurrentProfile() profile: any,
  ) {
    if (!channelId) {
      throw new BadRequestException('Channel ID is required');
    }

    return await this.channelService.getChannelById(channelId, profile.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(ValidationPipe) dto: CreateChannelDto,
    @CurrentProfile() profile: any,
  ) {
    return await this.channelService.createChannel(profile.id, dto);
  }

  @Patch(':channelId')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('channelId') channelId: string,
    @Body(ValidationPipe) dto: UpdateChannelDto,
    @CurrentProfile() profile: any,
  ) {
    if (!channelId) {
      throw new BadRequestException('Channel ID is required');
    }

    return await this.channelService.updateChannel(channelId, profile.id, dto);
  }

  @Delete(':channelId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('channelId') channelId: string,
    @CurrentProfile() profile: any,
  ) {
    if (!channelId) {
      throw new BadRequestException('Channel ID is required');
    }

    await this.channelService.deleteChannel(channelId, profile.id);
  }
}
