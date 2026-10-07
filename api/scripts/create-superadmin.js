require('dotenv').config();

const prisma = require('../prisma');
const { hashPassword } = require('../auth/password');

async function main() {
  const email = String(process.env.SUPERADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.SUPERADMIN_PASSWORD || '');
  const name = String(process.env.SUPERADMIN_NAME || 'Alan').trim();
  const lastName = String(process.env.SUPERADMIN_LAST_NAME || 'Burga').trim();

  if (!email || password.length < 10) {
    throw new Error('Define SUPERADMIN_EMAIL y SUPERADMIN_PASSWORD (mínimo 10 caracteres).');
  }

  const data = {
    name,
    lastName,
    passwordHash: hashPassword(password),
    role: 'SUPERADMIN',
    status: 'ACTIVE',
  };

  const user = await prisma.user.upsert({
    where: { email },
    update: data,
    create: { ...data, email },
  });

  console.log(`Superadmin listo: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
