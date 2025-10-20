import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MemberService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.member.findMany({
      include: { profile: true, server: true },
    });
  }
}
