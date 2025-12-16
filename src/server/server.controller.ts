import { Controller, Post, Patch, Delete, Param, UseGuards, BadRequestException, Body, HttpCode, ValidationPipe, HttpStatus } from '@nestjs/common';
import { ServerService } from './server.service';
import { CurrentProfile } from '~/common/decorators/current-profile.decorator';
import { AuthGuard } from '~/common/guards/auth.guard';
import { CreateServerDto } from './dto/create-server.dto';
import { UpdateServerDto } from './dto/update-server.dto';

@Controller('servers')
@UseGuards(AuthGuard)
export class ServerController {
  constructor(private serverService: ServerService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(ValidationPipe) dto: CreateServerDto,
    @CurrentProfile() profile: any,
  ) {
    return await this.serverService.createServer(profile.id, dto);
  }

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

  @Patch(':serverId/invite-code')
  @HttpCode(HttpStatus.OK)
  async updateInviteCode(
    @Param('serverId') serverId: string,
    @CurrentProfile() profile: any,
  ) {
    if (!serverId) {
      throw new BadRequestException('Server ID is required');
    }

    return await this.serverService.updateInviteCode(serverId, profile.id);
  }

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
}
