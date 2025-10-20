import { PrismaClient } from '../../generated/prisma';
const prisma = new PrismaClient();

async function main() {
  // 🔹 Lấy toàn bộ profile cùng với server & member liên quan
  const profiles = await prisma.profile.findMany({
    include: {
      server: true,
      members: true,
    },
  });

  console.log('Profiles:', profiles);

  // 🔹 Hoặc lấy tất cả server kèm profile và members
  const servers = await prisma.server.findMany({
    include: {
      profile: true,
      members: true,
    },
  });

  console.log('Servers:', servers);

  // 🔹 Hoặc lấy tất cả member kèm server và profile
  const members = await prisma.member.findMany({
    include: {
      server: true,
      profile: true,
    },
  });

  console.log('Members:', members);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
