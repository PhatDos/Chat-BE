import { IsString } from 'class-validator';

export class RespondFriendRequestDto {
  @IsString()
  requestId!: string;
}
