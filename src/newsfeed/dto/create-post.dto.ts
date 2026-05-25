import { FileType, PostVisibility } from '~/generated/prisma';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsOptional()
  @MaxLength(4000)
  content?: string;

  @IsString()
  @IsOptional()
  fileUrl?: string;

  @IsEnum(FileType)
  @IsOptional()
  fileType?: FileType;

  @IsEnum(PostVisibility)
  @IsOptional()
  visibility?: PostVisibility;
}
