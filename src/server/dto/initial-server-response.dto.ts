export class InitialChannelDto {
  channelId!: string;
  channelName!: string;
}

export class InitialServerResponseDto {
  server!: {
    id: string;
    name: string;
    imageUrl: string;
    inviteCode: string;
    profileId: string;
    generalChannelId: string | null;
    generalChannel?: {
      id: string;
      name: string;
    } | null;
  };

  initialChannel!: InitialChannelDto | null;
}
