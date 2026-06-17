import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ServerVisibility } from '~/generated/prisma/client';

export class CreateServerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @IsEnum(ServerVisibility)
  @IsOptional()
  visibility?: ServerVisibility;
}
