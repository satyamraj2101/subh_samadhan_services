import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Permissions (add what you need)
  const perms = [
    { code: 'ticket:create', description: 'Create ticket' },
    { code: 'ticket:read', description: 'Read ticket' },
    { code: 'ticket:update', description: 'Update ticket' },
    { code: 'ticket:assign', description: 'Assign ticket' },
    { code: 'user:read', description: 'Read users' },
    { code: 'user:update', description: 'Update users' },
  ]
  for (const p of perms) {
    await prisma.permission.upsert({ where: { code: p.code }, update: {}, create: p })
  }

  // Roles
  const roles = [
    { code: 'CUSTOMER', name: 'Customer', description: 'End customer' },
    { code: 'AGENT', name: 'Agent', description: 'Support agent' },
    { code: 'ADMIN', name: 'Admin', description: 'Administrator' },
  ]
  for (const r of roles) {
    await prisma.role.upsert({
      where: { code: r.code },
      update: {},
      create: r,
    })
  }

  // Role ↔ Perms
  const link = async (roleCode: string, permCodes: string[]) => {
    const role = await prisma.role.findUnique({ where: { code: roleCode } })
    if (!role) return
    for (const c of permCodes) {
      const perm = await prisma.permission.findUnique({ where: { code: c } })
      if (perm) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
          update: {},
          create: { roleId: role.id, permissionId: perm.id }
        })
      }
    }
  }
  await link('CUSTOMER', ['ticket:create', 'ticket:read'])
  await link('AGENT', ['ticket:read', 'ticket:update', 'ticket:assign'])
  await link('ADMIN', ['ticket:create', 'ticket:read', 'ticket:update', 'ticket:assign', 'user:read', 'user:update'])
}

main().finally(() => prisma.$disconnect())
