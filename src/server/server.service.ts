import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ServerService {
  constructor(private prismaService: PrismaService) {}

  create(createServerDto: Prisma.ServerCreateInput) {
    return this.prismaService.server.create({
      data: createServerDto,
      include: { members: true, profile: true },
    });
  }

  findAll() {
    return this.prismaService.server.findMany({
      include: { members: true, profile: true },
    });
  }

  findOne(id: string) {
    return this.prismaService.server.findUnique({
      where: { id },
      include: { members: true, profile: true },
    });
  }

  update(id: string, updateServerDto: Prisma.ServerUpdateInput) {
    return this.prismaService.server.update({
      where: { id },
      data: updateServerDto,
      include: { members: true, profile: true },
    });
  }

  remove(id: string) {
    return this.prismaService.server.delete({
      where: { id },
    });
  }
}
