import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.profile.findMany({
      include: { server: true, members: true },
    });
  }

  findOne(id: string) {
    return this.prisma.profile.findUnique({
      where: { id },
      include: { server: true, members: true },
    });
  }

  create(data: any) {
    return this.prisma.profile.create({ data });
  }

  delete(id: string) {
    return this.prisma.profile.delete({ where: { id } });
  }
}
