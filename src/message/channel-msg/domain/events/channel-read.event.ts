export class ChannelReadEvent {
  constructor(
    public readonly channelId: string,
    public readonly serverId: string,
    public readonly profileId: string,
    public readonly lastReadAt: Date,
  ) {}
}
