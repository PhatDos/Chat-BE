import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AccountDto {
  @IsOptional() // Khi create thì không cần id, nhưng update có thể có
  id?: number;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  permission: string;
}
