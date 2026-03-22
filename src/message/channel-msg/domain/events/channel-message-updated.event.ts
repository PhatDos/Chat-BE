import { MessageEntity } from '../entities/message.entity';

export class ChannelMessageUpdatedEvent {
  constructor(public readonly message: MessageEntity) {}
}
