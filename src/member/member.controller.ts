import {
  Controller,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Patch,
  Body,
  ValidationPipe,
} from '@nestjs/common';
import { MemberService } from './member.service';
import { CurrentProfile } from '~/common/decorators/current-profile.decorator';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { DeleteMemberDto } from './dto/delete-member.dto';
import { ChannelRefetchService } from '~/message/channel-refetch.service';
import type { Profile } from '~/common/types/profile.type';

@Controller('members')
export class MemberController {
  constructor(
    private memberService: MemberService,
    private channelRefetchService: ChannelRefetchService,
  ) {}

  @Delete(':memberId')
  @HttpCode(HttpStatus.OK)
  async deleteMember(
    @Param('memberId') memberId: string,
    @Body(ValidationPipe) dto: DeleteMemberDto,
    @CurrentProfile() profile: Profile,
  ) {
    if (!memberId) {
      throw new BadRequestException('Member ID is required');
    }

    if (!dto.serverId) {
      throw new BadRequestException('Server ID is required');
    }

    const updatedServer = await this.memberService.deleteMember(
      memberId,
      dto.serverId,
      profile.id,
    );

    await this.channelRefetchService.emitByServer(dto.serverId);

    return updatedServer;
  }

  @Patch(':memberId')
  @HttpCode(HttpStatus.OK)
  async updateMemberRole(
    @Param('memberId') memberId: string,
    @Body(ValidationPipe) dto: UpdateMemberRoleDto,
    @CurrentProfile() profile: Profile,
  ) {
    if (!memberId) {
      throw new BadRequestException('Member ID is required');
    }

    if (!dto.serverId) {
      throw new BadRequestException('Server ID is required');
    }

    const updatedServer = await this.memberService.updateMemberRole(
      memberId,
      dto.serverId,
      profile.id,
      dto.role,
    );

    await this.channelRefetchService.emitByServer(dto.serverId);

    return updatedServer;
  }
}
