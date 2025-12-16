import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateServerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  imageUrl: string;
}
