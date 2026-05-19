export class FriendDto {
  id!: string;
  profileId!: string;
  name!: string;
  imageUrl!: string;
  isOnline!: boolean;
}

export class FriendListResponseDto {
  items!: FriendDto[];
  count!: number;
}
