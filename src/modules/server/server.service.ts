import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ServerService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.server.findMany({
      include: { members: true, profile: true },
    });
  }
}
