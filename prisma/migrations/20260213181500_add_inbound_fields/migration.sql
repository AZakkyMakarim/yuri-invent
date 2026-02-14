-- Manually applied migration for Inbound fields and enums

-- AlterEnum
ALTER TYPE "InboundDiscrepancyType" ADD VALUE 'OVERAGE';
ALTER TYPE "InboundDiscrepancyType" ADD VALUE 'WRONG_ITEM';
ALTER TYPE "InboundDiscrepancyType" ADD VALUE 'DAMAGED';

-- CreateEnum
CREATE TYPE "InboundItemStatus" AS ENUM ('OPEN_ISSUE', 'COMPLETED', 'RESOLVED', 'CLOSED_SHORT');

-- AlterTable
ALTER TABLE "inbounds" ADD COLUMN     "paymentAmount" DECIMAL(18,2),
ADD COLUMN     "paymentDate" TIMESTAMP(3),
ADD COLUMN     "paymentProofUrl" TEXT;

-- AlterTable
ALTER TABLE "inbound_items" ADD COLUMN     "quantityAddedToStock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "InboundItemStatus" NOT NULL DEFAULT 'OPEN_ISSUE';
