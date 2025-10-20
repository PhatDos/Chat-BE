import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // làm global, các module khác không cần import PrismaModule vẫn dùng PrismaService
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
