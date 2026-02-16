import { Controller, Get, Post, Patch, Delete, Param, UseGuards, BadRequestException, Body, HttpCode, ValidationPipe, HttpStatus, Query } from '@nestjs/common';
import { ServerService } from './server.service';
import { CurrentProfile } from '~/common/decorators/current-profile.decorator';
import { AuthGuard } from '~/common/guards/auth.guard';
import { ServerMemberGuard } from '~/common/guards/server-member.guard';
import { RoleGuard } from '~/common/guards/role.guard';
import { Roles } from '~/common/decorators/roles.decorator';
import { MemberRole } from '@prisma/client';
import { CreateServerDto } from './dto/create-server.dto';
import { UpdateServerDto } from './dto/update-server.dto';
import { PaginationDto } from './dto/pagination.dto';

@Controller('servers')
export class ServerController {
  constructor(private serverService: ServerService) {}

  @Get('initial')
  @HttpCode(HttpStatus.OK)
  async getInitialServer(@CurrentProfile() profile: any) {
    return await this.serverService.getInitialServer(profile.id);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getMyServers(@CurrentProfile() profile: any, @Query() paginationDto: PaginationDto) {
    return await this.serverService.getServersByProfileId(profile.id, paginationDto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(ValidationPipe) dto: CreateServerDto,
    @CurrentProfile() profile: any,
  ) {
    return await this.serverService.createServer(profile.id, dto);
  }

  @UseGuards(ServerMemberGuard, RoleGuard)
  @Roles(MemberRole.SERVEROWNER, MemberRole.VICESERVEROWNER)
  @Patch(':serverId')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('serverId') serverId: string,
    @Body(ValidationPipe) dto: UpdateServerDto,
    @CurrentProfile() profile: any,
  ) {
    if (!serverId) {
      throw new BadRequestException('Server ID is required');
    }

    return await this.serverService.updateServer(serverId, profile.id, dto);
  }

  @UseGuards(ServerMemberGuard, RoleGuard)
  @Roles(MemberRole.SERVEROWNER)
  @Delete(':serverId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('serverId') serverId: string,
    @CurrentProfile() profile: any,
  ) {
    if (!serverId) {
      throw new BadRequestException('Server ID is required');
    }

    await this.serverService.deleteServer(serverId, profile.id);
  }

  @UseGuards(ServerMemberGuard, RoleGuard)
  @Roles(MemberRole.SERVEROWNER, MemberRole.VICESERVEROWNER)
  @Patch(':serverId/invite-code')
  @HttpCode(HttpStatus.OK)
  async updateInviteCode(
    @Param('serverId') serverId: string,
    @CurrentProfile() profile: any,
  ) {
    if (!serverId) {
      throw new BadRequestException('Server ID is required');
    }

    return await this.serverService.updateInviteCode(serverId);
  }

  @UseGuards(ServerMemberGuard)
  @Patch(':serverId/leave')
  @HttpCode(HttpStatus.OK)
  async leaveServer(
    @Param('serverId') serverId: string,
    @CurrentProfile() profile: any,
  ) {
    if (!serverId) {
      throw new BadRequestException('Server ID is required');
    }

    return await this.serverService.leaveServer(serverId, profile.id);
  }

  @UseGuards(ServerMemberGuard)
  @Get(':serverId/unread')
  @HttpCode(HttpStatus.OK)
  async getUnreadByServer(
    @Param('serverId') serverId: string,
    @CurrentProfile() profile: any,
  ) {
    return await this.serverService.getUnreadMap(serverId, profile.id);
  }

  @Post('invite/:inviteCode')
  @HttpCode(HttpStatus.OK)
  async joinByInviteCode(
    @Param('inviteCode') inviteCode: string,
    @CurrentProfile() profile: any,
  ) {
    if (!inviteCode) {
      throw new BadRequestException('Invite code is required');
    }

    return await this.serverService.joinServerByInviteCode(inviteCode, profile.id);
  }
}
