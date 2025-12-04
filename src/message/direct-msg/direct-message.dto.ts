import { IsOptional, IsString, IsEnum } from 'class-validator';
import { FileType } from '@prisma/client';

export class CreateDirectMessageDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(FileType)
  fileType?: FileType;

  @IsOptional()
  @IsString()
  fileUrl?: string | null;

  @IsString()
  conversationId!: string;

  @IsString()
  senderId!: string;
}

export class UpdateDirectMessageDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;
}
