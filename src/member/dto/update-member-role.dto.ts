import { IsEnum, IsString } from 'class-validator';
import { MemberRole } from '~/generated/prisma';

export class UpdateMemberRoleDto {
  @IsString()
  serverId: string;

  @IsEnum(MemberRole)
  role: MemberRole;
}
