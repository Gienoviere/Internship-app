const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("Test123", 12);

  await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@test.com",
      passwordHash: hash,
      role: "ADMIN",
      active: true
    }
  });

  console.log("Admin ensured");
}

main().finally(() => prisma.$disconnect());