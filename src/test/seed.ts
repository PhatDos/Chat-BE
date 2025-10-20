import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // ===== 1️⃣ Tạo Profile =====
  const profile = await prisma.profile.create({
    data: {
      userId: 'user_123',
      name: 'John Doe',
      imageUrl: 'https://example.com/avatar.jpg',
      email: 'john@example.com',
    },
  });

  // ===== 2️⃣ Tạo Server =====
  const server = await prisma.server.create({
    data: {
      name: 'My Server',
      imageUrl: 'https://example.com/server.png',
      inviteCode: 'INV1234',
      profileId: profile.id,
    },
  });

  // ===== 3️⃣ Tạo Member =====
  const member = await prisma.member.create({
    data: {
      role: 'SERVEROWNER',
      profileId: profile.id,
      serverId: server.id,
    },
  });

  // ===== 4️⃣ Tạo Channel =====
  const channel = await prisma.channel.create({
    data: {
      name: 'general',
      type: 'TEXT',
      profileId: profile.id,
      serverId: server.id,
    },
  });

  // ===== 5️⃣ Tạo Message =====
  const message = await prisma.message.create({
    data: {
      content: 'Hello world!',
      memberId: member.id,
      channelId: channel.id,
    },
  });

  // ===== 6️⃣ Tạo Conversation =====
  const conversation = await prisma.conversation.create({
    data: {
      memberOneId: member.id,
      memberTwoId: member.id, // trong test 1 member thôi
    },
  });

  // ===== 7️⃣ Tạo DirectMessage =====
  const directMessage = await prisma.directMessage.create({
    data: {
      content: 'Hi there!',
      memberId: member.id,
      conversationId: conversation.id,
    },
  });

  console.log({
    profile,
    server,
    member,
    channel,
    message,
    conversation,
    directMessage,
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
