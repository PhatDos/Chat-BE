import { IsString } from 'class-validator';

export class PingPresenceDto {
  @IsString()
  profileId!: string;
}
