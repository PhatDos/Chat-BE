import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ChannelType } from '~/generated/prisma/client';

export class UpdateChannelDto {
  @IsString()
  @IsOptional()
  name: string;

  @IsEnum(ChannelType)
  @IsOptional()
  type?: ChannelType;
}
