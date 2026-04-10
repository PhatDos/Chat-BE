import { MessageEntity } from '../entities/message.entity';

export class ChannelMessageCreatedEvent {
  constructor(
    public readonly message: MessageEntity,
    public readonly channel: any, // or ChannelEntity later
    public readonly member: any,
    public readonly tempId?: string,
  ) {}
}
