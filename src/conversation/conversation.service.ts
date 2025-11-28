import { Injectable } from '@nestjs/common';
import { PrismaService } from '~/prisma/prisma.service';
import { Prisma, Conversation, DirectMessage } from '@prisma/client';

@Injectable()
export class ConversationService {
  constructor(private readonly prisma: PrismaService) {}

  // ----------------------------
  // Include dùng chung cho tất cả query (chỉ member, không include messages)
  // ----------------------------
  private conversationInclude = {
    memberOne: { include: { profile: true } },
    memberTwo: { include: { profile: true } },
  };

  // ----------------------------
  // CRUD Conversation
  // ----------------------------
  async create(createConversationDto: Prisma.ConversationCreateInput) {
    return this.prisma.conversation.create({
      data: createConversationDto,
      include: this.conversationInclude,
    });
  }

  async findAll() {
    return this.prisma.conversation.findMany({
      include: this.conversationInclude,
    });
  }

  async findOne(id: string) {
    return this.prisma.conversation.findUnique({
      where: { id },
      include: this.conversationInclude,
    });
  }

  async update(id: string, data: Prisma.ConversationUpdateInput) {
    return this.prisma.conversation.update({
      where: { id },
      data,
      include: this.conversationInclude,
    });
  }

  async remove(id: string) {
    return this.prisma.conversation.delete({ where: { id } });
  }

  // ----------------------------
  // 1:1 Chat logic
  // ----------------------------
  async getOrCreateConversation(
    memberOneId: string,
    memberTwoId: string,
  ): Promise<
    Conversation & {
      memberOne: any;
      memberTwo: any;
    }
  > {
    let conversation = await this.findConversation(memberOneId, memberTwoId);

    if (!conversation) {
      conversation = await this.createConversation(memberOneId, memberTwoId);
    }

    return conversation;
  }

  private async findConversation(
    memberOneId: string,
    memberTwoId: string,
  ): Promise<
    | (Conversation & {
        memberOne: any;
        memberTwo: any;
      })
    | null
  > {
    return this.prisma.conversation.findFirst({
      where: {
        OR: [
          { memberOneId, memberTwoId },
          { memberOneId: memberTwoId, memberTwoId: memberOneId },
        ],
      },
      include: this.conversationInclude,
    });
  }

  private async createConversation(
    memberOneId: string,
    memberTwoId: string,
  ): Promise<
    Conversation & {
      memberOne: any;
      memberTwo: any;
    }
  > {
    return this.prisma.conversation.create({
      data: { memberOneId, memberTwoId },
      include: this.conversationInclude,
    });
  }

  // ----------------------------
  // Lấy tất cả messages trong conversation
  // ----------------------------
  async getMessages(conversationId: string) {
    return this.prisma.directMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        member: { include: { profile: true } },
      },
    });
  }
}
