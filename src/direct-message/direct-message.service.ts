import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DirectMessageService {
  constructor(private prismaService: PrismaService) {}

  create(createDirectMessageDto: Prisma.DirectMessageCreateInput) {
    return this.prismaService.directMessage.create({
      data: createDirectMessageDto,
    });
  }

  findAll() {
    return this.prismaService.directMessage.findMany();
  }

  findOne(id: string) {
    return this.prismaService.directMessage.findUnique({
      where: { id },
    });
  }

  update(id: string, updateDirectMessageDto: Prisma.DirectMessageUpdateInput) {
    return this.prismaService.directMessage.update({
      where: { id },
      data: updateDirectMessageDto,
    });
  }

  remove(id: string) {
    return this.prismaService.directMessage.delete({
      where: { id },
    });
  }
}
