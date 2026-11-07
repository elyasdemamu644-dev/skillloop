import { PrismaClient } from "@prisma/client";

// Bootstraps the first administrator.
//
//   npm run grant-admin -- you@example.com
//
// There is no way to become an admin through the API (by design), so this is
// the deliberate, auditable path: it only promotes an account that already
// exists, and it says plainly who it changed.
const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.argv[2]?.trim().toLowerCase();

  if (!email) {
    console.error("Usage: npm run grant-admin -- <email>");
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, isAdmin: true } });

  if (!user) {
    console.error(`No account found for ${email}. Register the account first, then run this again.`);
    process.exitCode = 1;
    return;
  }

  if (user.isAdmin) {
    console.log(`${user.email} is already an admin.`);
    return;
  }

  await prisma.user.update({ where: { id: user.id }, data: { isAdmin: true } });
  console.log(`Granted admin to ${user.email}.`);
  console.log("Sign out and back in to see the admin dashboard.");
}

main()
  .catch((error) => {
    console.error("Failed to grant admin:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
