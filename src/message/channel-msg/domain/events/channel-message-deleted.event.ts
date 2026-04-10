export class ChannelMessageDeletedEvent {
  constructor(
    public readonly messageId: string,
    public readonly channelId: string,
  ) {}
}
