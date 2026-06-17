import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '~/prisma/prisma.service';
import {
  CreateDirectMessageDto,
  UpdateDirectMessageDto,
} from './direct-message.dto';
import { FileType } from '~/generated/prisma/client';

@Injectable()
export class DirectMessageService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDirectMessageDto) {
    return this.prisma.directMessage.create({
      data: {
        content: dto.content ?? '',
        fileUrl: dto.fileUrl ?? null,
        fileType: dto.fileType ?? FileType.text,
        conversation: { connect: { id: dto.conversationId } },
        sender: { connect: { id: dto.senderId } },
      },
      include: {
        sender: true,
      },
    });
  }

  async getMessages(conversationId: string, cursor?: string) {
    const LIMIT = 10;

    const messages = await this.prisma.directMessage.findMany({
      where: { conversationId },
      take: LIMIT,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: true,
      },
    });

    const nextCursor =
      messages.length === LIMIT ? messages[messages.length - 1].id : null;

    return {
      items: messages,
      nextCursor,
    };
  }

  async searchMessages(
    conversationId: string,
    profileId: string,
    query: string,
    limit = 20,
  ) {
    const normalizedQuery = query?.trim();

    if (!conversationId) {
      throw new BadRequestException('conversationId is required');
    }

    if (!normalizedQuery) {
      throw new BadRequestException('Search query is required');
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { profileOneId: true, profileTwoId: true },
    });

    if (
      !conversation ||
      (conversation.profileOneId !== profileId &&
        conversation.profileTwoId !== profileId)
    ) {
      throw new ForbiddenException('You cannot search this conversation');
    }

    const messages = await this.prisma.directMessage.findMany({
      where: {
        conversationId,
        deleted: false,
        content: {
          contains: normalizedQuery,
          mode: 'insensitive',
        },
      },
      take: Math.min(limit, 20),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        sender: true,
      },
    });

    return { items: messages };
  }

  // FIND ONE
  async findOne(id: string) {
    return this.prisma.directMessage.findUnique({
      where: { id },
      include: { sender: true },
    });
  }

  // UPDATE
  async update(id: string, dto: UpdateDirectMessageDto) {
    return this.prisma.directMessage.update({
      where: { id },
      data: {
        content: dto.content ?? undefined,
        fileUrl: dto.fileUrl ?? undefined,
      },
      select: {
        id: true,
        content: true,
        fileUrl: true,
        fileType: true,
        senderId: true,
        conversationId: true,
        createdAt: true,
        updatedAt: true,
        deleted: true,
        sender: true,
      },
    });
  }

  // DELETE
  async delete(id: string) {
    return this.prisma.directMessage.update({
      where: { id },
      data: {
        fileUrl: null,
        content: 'This message has been deleted',
        deleted: true,
      },
      include: { sender: true },
    });
  }

  async findConversationById(conversationId: string) {
    return this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        profileOne: true,
        profileTwo: true,
      },
    });
  }

  async getFirstConversation(profileId: string) {
    return this.prisma.conversation.findFirst({
      where: {
        OR: [{ profileOneId: profileId }, { profileTwoId: profileId }],
      },
      include: {
        profileOne: true,
        profileTwo: true,
      },
    });
  }

  async getConversationsList(profileId: string) {
    return this.prisma.conversation.findMany({
      where: {
        OR: [{ profileOneId: profileId }, { profileTwoId: profileId }],
      },
      include: {
        profileOne: true,
        profileTwo: true,
        directMessages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async validateProfile(profileId: string) {
    return this.prisma.profile.findUnique({
      where: { id: profileId },
    });
  }

  async getOrCreateConversation(profileAId: string, profileBId: string) {
    const [profileOneId, profileTwoId] =
      profileAId < profileBId
        ? [profileAId, profileBId]
        : [profileBId, profileAId];

    return this.prisma.conversation.upsert({
      where: {
        profileOneId_profileTwoId: {
          profileOneId,
          profileTwoId,
        },
      },
      update: {}, // không cần update gì
      create: {
        profileOneId,
        profileTwoId,
      },
      include: {
        profileOne: true,
        profileTwo: true,
      },
    });
  }
}
