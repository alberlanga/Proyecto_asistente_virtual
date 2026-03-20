import prisma from './utils/prisma';
import bcrypt from 'bcrypt';

async function main() {
  const email = 'admin@somos.plus';
  const password = 'admin123';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Admin ya existe:', email);
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const admin = await prisma.user.create({
    data: { email, password: hashed, role: 'ADMIN', maxAssistants: 999, maxPhoneNumbers: 999 }
  });
  console.log('Admin creado:', admin.email);
  console.log('Password:', password);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
