import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '~/prisma/prisma.service';

type PollOptionSnapshot = {
  id: string;
  text: string;
  votesCount: number;
  isSelected: boolean;
};

type PollSnapshot = {
  id: string;
  question: string;
  channelId: string;
  createdAt: Date;
  createdBy: {
    id: string;
    profileId: string;
    profile: {
      id: string;
      name: string;
      imageUrl: string;
    };
  };
  options: PollOptionSnapshot[];
  totalVotes: number;
  myVoteOptionId: string | null;
};

type PollEventPayload = {
  channelId: string;
  action: 'created' | 'voted' | 'deleted';
  question: string;
  pollId?: string;
};

@Injectable()
export class PollService {
  constructor(private readonly prisma: PrismaService) {}

  private get pollClient() {
    return this.prisma as any;
  }

  private async resolveChannelAndMember(channelId: string, profileId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true, serverId: true },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    const member = await this.prisma.member.findUnique({
      where: {
        serverId_profileId: {
          serverId: channel.serverId,
          profileId,
        },
      },
      include: { profile: true },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this server');
    }

    return { channel, member };
  }

  private normalizePoll(poll: any, memberId?: string): PollSnapshot {
    const options = (poll.options ?? []).map((option: any) => {
      const votes = Array.isArray(option.votes) ? option.votes : [];
      const isSelected = memberId
        ? votes.some((vote: any) => vote.memberId === memberId)
        : false;

      return {
        id: option.id,
        text: option.text,
        votesCount: votes.length,
        isSelected,
      };
    });

    const myVoteOptionId = options.find((option) => option.isSelected)?.id ?? null;

    return {
      id: poll.id,
      question: poll.question,
      channelId: poll.channelId,
      createdAt: poll.createdAt,
      createdBy: {
        id: poll.createdBy.id,
        profileId: poll.createdBy.profileId,
        profile: {
          id: poll.createdBy.profile.id,
          name: poll.createdBy.profile.name,
          imageUrl: poll.createdBy.profile.imageUrl,
        },
      },
      options,
      totalVotes: options.reduce((sum, option) => sum + option.votesCount, 0),
      myVoteOptionId,
    };
  }

  private async loadPoll(pollId: string, memberId?: string) {
    const poll = await this.pollClient.poll.findUnique({
      where: { id: pollId },
      include: {
        createdBy: { include: { profile: true } },
        options: {
          include: {
            votes: {
              select: {
                memberId: true,
              },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    return this.normalizePoll(poll, memberId);
  }

  async getPolls(channelId: string, profileId: string) {
    if (!channelId) {
      throw new BadRequestException('Channel ID missing');
    }

    const { member } = await this.resolveChannelAndMember(channelId, profileId);

    const polls = await this.pollClient.poll.findMany({
      where: { channelId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { include: { profile: true } },
        options: {
          include: {
            votes: {
              select: {
                memberId: true,
              },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    });

    return {
      items: polls.map((poll) => this.normalizePoll(poll, member.id)),
    };
  }

  async createPoll(input: {
    channelId: string;
    profileId: string;
    question: string;
    options: string[];
  }) {
    const question = input.question.trim();
    const options = input.options.map((option) => option.trim()).filter(Boolean);

    if (!question) {
      throw new BadRequestException('Poll question is required');
    }

    if (options.length < 2) {
      throw new BadRequestException('Poll must have at least two options');
    }

    const uniqueOptions = Array.from(new Set(options));
    if (uniqueOptions.length < 2) {
      throw new BadRequestException('Poll options must be different');
    }

    const { member } = await this.resolveChannelAndMember(
      input.channelId,
      input.profileId,
    );

    const created = await this.pollClient.poll.create({
      data: {
        question,
        channel: { connect: { id: input.channelId } },
        createdBy: { connect: { id: member.id } },
        options: {
          create: uniqueOptions.map((text) => ({ text })),
        },
      },
      include: {
        createdBy: { include: { profile: true } },
        options: {
          include: {
            votes: {
              select: {
                memberId: true,
              },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    });

    return this.normalizePoll(created, member.id);
  }

  async voteOnPoll(input: {
    pollId: string;
    optionId: string;
    profileId: string;
  }) {
    const poll = await this.pollClient.poll.findUnique({
      where: { id: input.pollId },
      include: {
        channel: true,
        options: {
          include: {
            votes: {
              select: {
                memberId: true,
              },
            },
          },
        },
      },
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    const { member } = await this.resolveChannelAndMember(
      poll.channelId,
      input.profileId,
    );

    const selectedOption = poll.options.find((option: any) => option.id === input.optionId);
    if (!selectedOption) {
      throw new BadRequestException('Poll option not found');
    }

    const currentVote = poll.options.find((option: any) =>
      option.votes.some((vote: any) => vote.memberId === member.id),
    );

    if (currentVote?.id === input.optionId) {
      return this.loadPoll(input.pollId, member.id);
    }

    await this.pollClient.pollVote.deleteMany({
      where: {
        memberId: member.id,
        option: {
          pollId: input.pollId,
        },
      },
    });

    await this.pollClient.pollVote.create({
      data: {
        option: { connect: { id: input.optionId } },
        member: { connect: { id: member.id } },
      },
    });

    return this.loadPoll(input.pollId, member.id);
  }

  async deletePoll(input: { pollId: string; profileId: string }) {
    const poll = await this.pollClient.poll.findUnique({
      where: { id: input.pollId },
      select: {
        id: true,
        question: true,
        channelId: true,
        createdBy: { select: { id: true } },
      },
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    const { member } = await this.resolveChannelAndMember(
      poll.channelId,
      input.profileId,
    );

    if (poll.createdBy.id !== member.id) {
      throw new ForbiddenException('You can only delete your own poll');
    }

    await this.pollClient.poll.delete({
      where: { id: input.pollId },
    });

    return {
      channelId: poll.channelId,
      action: 'deleted' as const,
      question: poll.question,
      pollId: poll.id,
    } satisfies PollEventPayload;
  }
}