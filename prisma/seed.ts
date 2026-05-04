import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123!", 12);

  await prisma.user.upsert({
    where: { email: "admin@dchosting.com.au" },
    update: {},
    create: {
      email: "admin@dchosting.com.au",
      name: "Admin",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("Seed complete: admin@dchosting.com.au / admin123!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
