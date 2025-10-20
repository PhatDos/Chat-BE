// import { PrismaClient } from '../../generated/prisma';

// const prisma = new PrismaClient();

// async function main() {
//   // 1️⃣ Tạo 1 profile
//   const profile = await prisma.profile.create({
//     data: {
//       userId: 'user_123',
//       name: 'John Doe',
//       imageUrl: 'https://example.com/avatar.jpg',
//       email: 'john@example.com',
//     },
//   });

//   // 2️⃣ Tạo 1 server cho profile này
//   const server = await prisma.server.create({
//     data: {
//       name: 'My Server',
//       imageUrl: 'https://example.com/server.png',
//       inviteCode: 'INV1234',
//       profileId: profile.id,
//     },
//   });

//   // 3️⃣ Tạo 1 member trong server này
//   const member = await prisma.member.create({
//     data: {
//       role: 'SERVEROWNER',
//       profileId: profile.id,
//       serverId: server.id,
//     },
//   });

//   console.log({ profile, server, member });
// }

// main()
//   .catch(console.error)
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
