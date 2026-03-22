import { IsOptional, IsEnum, IsString, IsBoolean } from 'class-validator';

export enum MessageFileType {
  text = 'text',
  img = 'img',
  pdf = 'pdf',
}

export class CreateChannelMessageDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsEnum(MessageFileType)
  fileType?: MessageFileType;

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

export class UpdateChannelNotifyDto {
  @IsString()
  serverId!: string;

  @IsBoolean()
  isNotify!: boolean;
}
