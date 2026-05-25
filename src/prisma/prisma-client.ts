import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '~/generated/prisma';

type PrismaClientOptions = {
  log?: Prisma.LogLevel[];
};

export function createPrismaClientOptions(
  options: PrismaClientOptions = {},
): ConstructorParameters<typeof PrismaClient>[0] {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required to initialize Prisma');
  }

  return {
    adapter: new PrismaPg({ connectionString }),
    log: options.log,
  };
}