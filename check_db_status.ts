
import { prisma } from './lib/prisma';

async function main() {
    const userCount = await prisma.user.count();
    const itemCount = await prisma.item.count();
    const roleCount = await prisma.role.count();

    console.log(`User count: ${userCount}`);
    console.log(`Item count: ${itemCount}`);
    console.log(`Role count: ${roleCount}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
