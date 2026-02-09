import { IsEnum, IsString } from 'class-validator';
import { MemberRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @IsString()
  serverId: string;

  @IsEnum(MemberRole)
  role: MemberRole;
}
