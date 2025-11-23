import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MemberService {
  constructor(private prismaService: PrismaService) {}

  create(createMemberDto: Prisma.MemberCreateInput) {
    return this.prismaService.member.create({
      data: createMemberDto,
    });
  }

  findAll() {
    return this.prismaService.member.findMany();
  }

  findOne(id: string) {
    return this.prismaService.member.findUnique({
      where: { id },
    });
  }

  update(id: string, updateMemberDto: Prisma.MemberUpdateInput) {
    return this.prismaService.member.update({
      where: { id },
      data: updateMemberDto,
    });
  }

  remove(id: string) {
    return this.prismaService.member.delete({
      where: { id },
    });
  }
}
