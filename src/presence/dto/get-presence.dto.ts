import { IsArray, IsString } from 'class-validator';

export class GetPresenceDto {
  @IsArray()
  @IsString({ each: true })
  profileIds: string[];
}
