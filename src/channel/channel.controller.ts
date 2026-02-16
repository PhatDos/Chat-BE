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
import { ServerMemberGuard } from '~/common/guards/server-member.guard';
import { RoleGuard } from '~/common/guards/role.guard';
import { Roles } from '~/common/decorators/roles.decorator';
import { MemberRole } from '@prisma/client';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@Controller('channels')
export class ChannelController {
  constructor(private channelService: ChannelService) {}

  @UseGuards(ServerMemberGuard)
  @Get('server/:serverId')
  @HttpCode(HttpStatus.OK)
  async getChannelsByServer(
    @Param('serverId') serverId: string,
    @CurrentProfile() profile: any,
  ) {
    if (!serverId) {
      throw new BadRequestException('Server ID is required');
    }

    return await this.channelService.getChannelsByServerId(serverId);
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

  @UseGuards(ServerMemberGuard, RoleGuard)
  @Roles(MemberRole.SERVEROWNER, MemberRole.VICESERVEROWNER)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(ValidationPipe) dto: CreateChannelDto,
    @CurrentProfile() profile: any,
  ) {
    return await this.channelService.createChannel(profile.id, dto);
  }

  @UseGuards(ServerMemberGuard, RoleGuard)
  @Roles(MemberRole.SERVEROWNER, MemberRole.VICESERVEROWNER)
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

    return await this.channelService.updateChannel(channelId, dto);
  }

  @UseGuards(ServerMemberGuard, RoleGuard)
  @Roles(MemberRole.SERVEROWNER, MemberRole.VICESERVEROWNER)
  @Delete(':channelId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('channelId') channelId: string,
    @CurrentProfile() profile: any,
  ) {
    if (!channelId) {
      throw new BadRequestException('Channel ID is required');
    }

    await this.channelService.deleteChannel(channelId);
  }
}
