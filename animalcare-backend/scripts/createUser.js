// scripts/createUser.js
const bcrypt = require("bcrypt");
const prisma = require("../src/prisma");

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const role = process.argv[4] || "SUPERVISOR";
  const name = process.argv[5] || "Supervisor Demo";

  if (!email || !password) {
    console.log("Usage: node scripts/createUser.js <email> <password> [ROLE] [NAME]");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role, passwordHash, active: true },
    create: { name, email, role, passwordHash, active: true },
    select: { id: true, name: true, email: true, role: true },
  });

  console.log("Created/updated user:", user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });