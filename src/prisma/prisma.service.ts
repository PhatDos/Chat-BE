import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '~/generated/prisma';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const connectionString = process.env.DATABASE_URL

    if (!connectionString) {
      throw new Error('DATABASE_URL is required to initialize Prisma')
    }

    super({
      adapter: new PrismaPg({ connectionString }),
    })
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
