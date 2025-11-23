import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfileService {
  constructor(private prismaService: PrismaService) {}

  create(createProfileDto: Prisma.ProfileCreateInput) {
    return this.prismaService.profile.create({
      data: createProfileDto,
      include: { server: true, members: true },
    });
  }

  findAll() {
    return this.prismaService.profile.findMany({
      include: { server: true, members: true },
    });
  }

  findOne(id: string) {
    return this.prismaService.profile.findUnique({
      where: { id },
      include: { server: true, members: true },
    });
  }

  update(id: string, updateProfileDto: Prisma.ProfileUpdateInput) {
    return this.prismaService.profile.update({
      where: { id },
      data: updateProfileDto,
      include: { server: true, members: true },
    });
  }

  remove(id: string) {
    return this.prismaService.profile.delete({
      where: { id },
    });
  }
}
