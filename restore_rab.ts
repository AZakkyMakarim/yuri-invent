
import { prisma } from './lib/prisma';

async function main() {
    console.log('💰 Creating Dummy RAB (Budget Plans)...');

    // 1. Get Admin User
    const adminUser = await prisma.user.findFirst();
    const userId = adminUser?.id;
    if (!userId) { throw new Error("No admin user found."); }

    // 2. Get Items
    const laptop = await prisma.item.findUnique({ where: { sku: 'ITEM-001' } });
    const chair = await prisma.item.findUnique({ where: { sku: 'ITEM-002' } });
    const monitor = await prisma.item.findUnique({ where: { sku: 'ITEM-003' } });

    if (!laptop || !chair || !monitor) {
        throw new Error("Missing items. Please run restore_master_data.ts first.");
    }

    // --- RAB 1: Monthly IT Operational (Approved) ---
    // Laptop: 2 units * 25.000.000 = 50.000.000
    // Monitor: 5 units * 2.500.000 = 12.500.000
    // Total: 62.500.000

    const rab1Total = 62500000;

    // Check if exists
    const existingRAB1 = await prisma.rAB.findUnique({ where: { code: 'RAB-2026-02-001' } });

    if (!existingRAB1) {
        const rab1 = await prisma.rAB.create({
            data: {
                code: 'RAB-2026-02-001',
                name: 'IT Equipment Upgrade - Feb 2026',
                fiscalYear: 2026,
                fiscalMonth: 2,
                totalBudget: rab1Total,
                remainingBudget: rab1Total,
                usedBudget: 0,
                status: 'APPROVED',
                createdById: userId,
                approvedById: userId,
                approvedAt: new Date(),
                notes: 'Approved for urgent developer needs.',
                rabLines: {
                    create: [
                        {
                            itemId: laptop.id,
                            requiredQty: 2,
                            lastStockSnapshot: laptop.currentStock,
                            replenishQty: 2,
                            unitPrice: 25000000,
                            totalAmount: 50000000,
                        },
                        {
                            itemId: monitor.id,
                            requiredQty: 5,
                            lastStockSnapshot: monitor.currentStock,
                            replenishQty: 5,
                            unitPrice: 2500000,
                            totalAmount: 12500000,
                        }
                    ]
                }
            }
        });
        console.log(`✅ Created Approved RAB: ${rab1.code}`);
    } else {
        console.log(`ℹ️ RAB-2026-02-001 already exists.`);
    }


    // --- RAB 2: Office Furniture (Draft) ---
    // Chair: 10 units * 3.500.000 = 35.000.000

    const rab2Total = 35000000;

    const existingRAB2 = await prisma.rAB.findUnique({ where: { code: 'RAB-2026-03-001' } });

    if (!existingRAB2) {
        const rab2 = await prisma.rAB.create({
            data: {
                code: 'RAB-2026-03-001',
                name: 'Office Furniture Renewal - Mar 2026',
                fiscalYear: 2026,
                fiscalMonth: 3,
                totalBudget: rab2Total,
                remainingBudget: rab2Total,
                usedBudget: 0,
                status: 'DRAFT',
                createdById: userId,
                notes: 'Planned for next month.',
                rabLines: {
                    create: [
                        {
                            itemId: chair.id,
                            requiredQty: 10,
                            lastStockSnapshot: chair.currentStock,
                            replenishQty: 10,
                            unitPrice: 3500000,
                            totalAmount: 35000000,
                        }
                    ]
                }
            }
        });
        console.log(`✅ Created Draft RAB: ${rab2.code}`);
    } else {
        console.log(`ℹ️ RAB-2026-03-001 already exists.`);
    }

    console.log('🎉 RAB Dummy Data created successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Failed to create RABs:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
