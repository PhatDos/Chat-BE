import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
// import { PrismaClient } from '~/generated/prisma';
import { PrismaClient } from '../generated/prisma';
import { createPrismaClientOptions } from './prisma-client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super(createPrismaClientOptions())
  }

  async onModuleInit() {
    await this.$connect();
    console.log('✅ Connected to Databaseee');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('🛑 Disconnected from Databaseee');
  }
}
