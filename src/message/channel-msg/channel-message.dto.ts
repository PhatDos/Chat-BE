import { IsOptional, IsEnum, IsString } from 'class-validator';
import { FileType } from '@prisma/client';

export class CreateChannelMessageDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsEnum(FileType)
  fileType?: FileType;

  @IsString()
  memberId!: string;

  @IsString()
  channelId!: string;
}

export class UpdateChannelMessageDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;
}
