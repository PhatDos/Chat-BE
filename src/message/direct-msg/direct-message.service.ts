import { Injectable } from '@nestjs/common';
import { PrismaService } from '~/prisma/prisma.service';
import {
  CreateDirectMessageDto,
  UpdateDirectMessageDto,
} from './direct-message.dto';
import { FileType } from '@prisma/client';

@Injectable()
export class DirectMessageService {
  constructor(private readonly prisma: PrismaService) {}

  // CREATE MESSAGE
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

  // GET MESSAGES
  async getMessages(conversationId: string, cursor?: string) {
    const LIMIT = 20;

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
      include: { sender: true },
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
}
