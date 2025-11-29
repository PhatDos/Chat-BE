import { Injectable } from '@nestjs/common';
import { PrismaService } from '~/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DirectMessageService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDirectMessageDto: Prisma.DirectMessageCreateInput) {
    return this.prisma.directMessage.create({
      data: createDirectMessageDto,
      include: {
        member: { include: { profile: true } },
      },
    });
  }

  // =============================
  // PAGINATION CHUẨN FE
  // =============================
  async getMessages(conversationId: string, cursor?: string) {
    const LIMIT = 20;

    const messages = await this.prisma.directMessage.findMany({
      where: { conversationId },
      take: LIMIT,
      skip: cursor ? 1 : 0, // skip cursor itself
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        member: { include: { profile: true } },
      },
    });

    const nextCursor =
      messages.length === LIMIT ? messages[messages.length - 1].id : null;

    return {
      items: messages,
      nextCursor,
    };
  }

  async findOne(id: string) {
    return this.prisma.directMessage.findUnique({
      where: { id },
      include: {
        member: { include: { profile: true } },
      },
    });
  }

  async update(
    id: string,
    updateDirectMessageDto: Prisma.DirectMessageUpdateInput,
  ) {
    return this.prisma.directMessage.update({
      where: { id },
      data: updateDirectMessageDto,
      include: {
        member: {
          include: {
            profile: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    return this.prisma.directMessage.update({
      where: { id },
      data: {
        fileUrl: null,
        content: 'This message has been deleted',
        deleted: true,
      },
      include: {
        member: {
          include: {
            profile: true,
          },
        },
      },
    });
  }
}
