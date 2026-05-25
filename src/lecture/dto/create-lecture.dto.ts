import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { LectureFileType } from '~/generated/prisma/client';

export class CreateLectureDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @IsEnum(LectureFileType)
  @IsNotEmpty()
  fileType: LectureFileType;

  @IsString()
  @IsNotEmpty()
  channelId: string;

  @IsString()
  @IsNotEmpty()
  memberId: string;
}
