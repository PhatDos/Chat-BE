import { Controller, Delete, Param, UseGuards, HttpCode, HttpStatus, BadRequestException, Query, Patch, Body, ValidationPipe } from '@nestjs/common';
import { MemberService } from './member.service';
import { AuthGuard } from '~/common/guards/auth.guard';
import { CurrentProfile } from '~/common/decorators/current-profile.decorator';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { DeleteMemberDto } from './dto/delete-member.dto';

@Controller('members')
@UseGuards(AuthGuard)
export class MemberController {
  constructor(private memberService: MemberService) {}

  @Delete(':memberId')
  @HttpCode(HttpStatus.OK)
  async deleteMember(
    @Param('memberId') memberId: string,
    @Body(ValidationPipe) dto: DeleteMemberDto,
    @CurrentProfile() profile: any,
  ) {
    if (!memberId) {
      throw new BadRequestException('Member ID is required');
    }

    if (!dto.serverId) {
      throw new BadRequestException('Server ID is required');
    }

    return await this.memberService.deleteMember(memberId, dto.serverId, profile.id);
  }

  @Patch(':memberId')
  @HttpCode(HttpStatus.OK)
  async updateMemberRole(
    @Param('memberId') memberId: string,
    @Body(ValidationPipe) dto: UpdateMemberRoleDto,
    @CurrentProfile() profile: any,
  ) {
    if (!memberId) {
      throw new BadRequestException('Member ID is required');
    }

    if (!dto.serverId) {
      throw new BadRequestException('Server ID is required');
    }

    return await this.memberService.updateMemberRole(memberId, dto.serverId, profile.id, dto.role);
  }
}
