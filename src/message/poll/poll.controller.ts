import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '~/common/guards/auth.guard';
import { CurrentProfile } from '~/common/decorators/current-profile.decorator';
import type { Profile } from '~/common/types/profile.type';
import { MessageGateway } from '../message.gateway';
import { PollService } from './poll.service';

@Controller('polls')
@UseGuards(AuthGuard)
export class PollController {
  constructor(
    private readonly pollService: PollService,
    private readonly messageGateway: MessageGateway,
  ) {}

  @Get()
  getPolls(
    @Query('channelId') channelId: string,
    @CurrentProfile() profile: Profile,
  ) {
    return this.pollService.getPolls(channelId, profile.id);
  }

  @Post()
  async createPoll(
    @Body()
    body: {
      channelId: string;
      question: string;
      options: string[];
    },
    @CurrentProfile() profile: Profile,
  ) {
    const poll = await this.pollService.createPoll({
      channelId: body.channelId,
      profileId: profile.id,
      question: body.question,
      options: body.options,
    });

    this.messageGateway.emitPollUpdated({
      channelId: poll.channelId,
      action: 'created',
      question: poll.question,
      pollId: poll.id,
    });

    return poll;
  }

  @Post(':pollId/vote')
  async votePoll(
    @Param('pollId') pollId: string,
    @Body() body: { optionId: string },
    @CurrentProfile() profile: Profile,
  ) {
    const poll = await this.pollService.voteOnPoll({
      pollId,
      optionId: body.optionId,
      profileId: profile.id,
    });

    this.messageGateway.emitPollUpdated({
      channelId: poll.channelId,
      action: 'voted',
      question: poll.question,
      pollId: poll.id,
    });

    return poll;
  }

  @Delete(':pollId')
  async deletePoll(
    @Param('pollId') pollId: string,
    @CurrentProfile() profile: Profile,
  ) {
    const event = await this.pollService.deletePoll({
      pollId,
      profileId: profile.id,
    });

    this.messageGateway.emitPollUpdated(event);

    return { success: true };
  }
}