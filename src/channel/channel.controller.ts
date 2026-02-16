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

@Controller('servers/:serverId/channels')
export class ChannelController {
  constructor(private channelService: ChannelService) {}

  @UseGuards(ServerMemberGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  async getChannelsByServer(
    @Param('serverId') serverId: string,
  ) {
    if (!serverId) {
      throw new BadRequestException('Server ID is required');
    }

    return await this.channelService.getChannelsByServerId(serverId);
  }

  @UseGuards(ServerMemberGuard)
  @Get(':channelId')
  @HttpCode(HttpStatus.OK)
  async getChannelById(
    @Param('serverId') serverId: string,
    @Param('channelId') channelId: string,
  ) {
    if (!serverId) {
      throw new BadRequestException('Server ID is required');
    }

    if (!channelId) {
      throw new BadRequestException('Channel ID is required');
    }

    return await this.channelService.getChannelById(serverId, channelId);
  }

  @UseGuards(ServerMemberGuard, RoleGuard)
  @Roles(MemberRole.SERVEROWNER, MemberRole.VICESERVEROWNER)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('serverId') serverId: string,
    @Body(ValidationPipe) dto: CreateChannelDto,
    @CurrentProfile() profile: any,
  ) {
    if (!serverId) {
      throw new BadRequestException('Server ID is required');
    }

    return await this.channelService.createChannel(serverId, profile.id, dto);
  }

  @UseGuards(ServerMemberGuard, RoleGuard)
  @Roles(MemberRole.SERVEROWNER, MemberRole.VICESERVEROWNER)
  @Patch(':channelId')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('serverId') serverId: string,
    @Param('channelId') channelId: string,
    @Body(ValidationPipe) dto: UpdateChannelDto,
  ) {
    if (!serverId) {
      throw new BadRequestException('Server ID is required');
    }

    if (!channelId) {
      throw new BadRequestException('Channel ID is required');
    }

    return await this.channelService.updateChannel(serverId, channelId, dto);
  }

  @UseGuards(ServerMemberGuard, RoleGuard)
  @Roles(MemberRole.SERVEROWNER, MemberRole.VICESERVEROWNER)
  @Delete(':channelId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('serverId') serverId: string,
    @Param('channelId') channelId: string,
  ) {
    if (!serverId) {
      throw new BadRequestException('Server ID is required');
    }

    if (!channelId) {
      throw new BadRequestException('Channel ID is required');
    }

    await this.channelService.deleteChannel(serverId, channelId);
  }
}
