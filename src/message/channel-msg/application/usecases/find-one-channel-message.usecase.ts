import { Injectable, Inject } from '@nestjs/common';
import { CHANNEL_MESSAGE_REPOSITORY } from '../../domain/repositories/channel-message.repository.interface';
import type { IChannelMessageRepository } from '../../domain/repositories/channel-message.repository.interface';

@Injectable()
export class FindOneChannelMessageUseCase {
  constructor(
    @Inject(CHANNEL_MESSAGE_REPOSITORY)
    private readonly channelMessageRepo: IChannelMessageRepository,
  ) {}

  async execute(id: string) {
    return this.channelMessageRepo.findOneMessage(id);
  }
}
