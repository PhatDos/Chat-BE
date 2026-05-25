import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ServerVisibility } from '~/generated/prisma';

export class UpdateServerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @IsEnum(ServerVisibility)
  @IsOptional()
  visibility?: ServerVisibility;
}
