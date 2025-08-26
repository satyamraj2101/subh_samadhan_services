// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // --- Roles ---
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { code: "ADMIN" },
      update: {},
      create: { code: "ADMIN", name: "Administrator" },
    }),
    prisma.role.upsert({
      where: { code: "AGENT" },
      update: {},
      create: { code: "AGENT", name: "Operations Agent" },
    }),
    prisma.role.upsert({
      where: { code: "CUSTOMER" },
      update: {},
      create: { code: "CUSTOMER", name: "Customer" },
    }),
  ]);
  console.log("✅ Roles seeded:", roles.map(r => r.code));

  // --- Permissions ---
  const permData = [
    { code: "ticket:create", description: "Create ticket" },
    { code: "ticket:read", description: "Read ticket" },
    { code: "ticket:update", description: "Update ticket" },
    { code: "ticket:assign", description: "Assign ticket" },
    { code: "user:manage", description: "Manage users" },
    { code: "content:manage", description: "Manage content" },
  ];
  await Promise.all(
    permData.map(p =>
      prisma.permission.upsert({
        where: { code: p.code },
        update: {},
        create: p,
      })
    )
  );
  console.log("✅ Permissions seeded");

  // --- Role → Permission mapping ---
  const allPerms = await prisma.permission.findMany();
  const adminPerms = allPerms.map(p => p.code);
  const agentPerms = ["ticket:read", "ticket:update", "ticket:assign"];
  const customerPerms = ["ticket:create", "ticket:read"];

  const mapPerms = async (roleCode: string, codes: string[]) => {
    const role = await prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) return;
    for (const c of codes) {
      const perm = allPerms.find(p => p.code === c);
      if (perm) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: { roleId: role.id, permissionId: perm.id },
          },
          update: {},
          create: { roleId: role.id, permissionId: perm.id },
        });
      }
    }
  };

  await mapPerms("ADMIN", adminPerms);
  await mapPerms("AGENT", agentPerms);
  await mapPerms("CUSTOMER", customerPerms);
  console.log("✅ Role permissions seeded");

  // --- Ticket Categories ---
  const categories = [
    { slug: "insurance", name: "Insurance", sortOrder: 10 },
    { slug: "loans", name: "Loans", sortOrder: 20 },
    { slug: "investments", name: "Investments", sortOrder: 30 },
    { slug: "taxation", name: "Taxation", sortOrder: 40 },
  ];
  await Promise.all(
    categories.map(c =>
      prisma.ticketCategory.upsert({
        where: { slug: c.slug },
        update: {},
        create: c,
      })
    )
  );
  console.log("✅ Ticket categories seeded");

  // --- Content Categories ---
  const contentCats = [
    { slug: "guides", name: "Guides" },
    { slug: "faqs", name: "FAQs" },
    { slug: "announcements", name: "Announcements" },
  ];
  await Promise.all(
    contentCats.map(c =>
      prisma.contentCategory.upsert({
        where: { slug: c.slug },
        update: {},
        create: c,
      })
    )
  );
  console.log("✅ Content categories seeded");

  console.log("🌱 Seed completed successfully");
}

main()
  .catch(e => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
