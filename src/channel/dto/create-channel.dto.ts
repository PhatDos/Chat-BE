import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ChannelType } from '~/generated/prisma';

export class CreateChannelDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ChannelType)
  @IsOptional()
  type: ChannelType;
}
