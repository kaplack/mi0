const { PrismaClient } = require('@prisma/client');

const prisma = globalThis.__mi0Prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__mi0Prisma = prisma;
}

module.exports = prisma;
