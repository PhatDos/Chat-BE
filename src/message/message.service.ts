import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '~/prisma/prisma.service';

@Injectable()
export class MessageService {
  constructor(private prismaService: PrismaService) {}

  create(createMessageDto: Prisma.MessageCreateInput) {
    return this.prismaService.message.create({
      data: createMessageDto,
    });
  }

  findAll() {
    return this.prismaService.message.findMany();
  }

  findOne(id: string) {
    return this.prismaService.message.findUnique({
      where: { id },
    });
  }

  update(id: string, updateMessageDto: Prisma.MessageUpdateInput) {
    return this.prismaService.message.update({
      where: { id },
      data: updateMessageDto,
    });
  }

  remove(id: string) {
    return this.prismaService.message.delete({
      where: { id },
    });
  }
}
