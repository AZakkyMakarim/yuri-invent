-- CreateEnum
CREATE TYPE "InboundDiscrepancyType" AS ENUM ('NONE', 'SHORTAGE', 'OVERAGE', 'WRONG_ITEM', 'DAMAGED');

-- CreateEnum
CREATE TYPE "DiscrepancyResolution" AS ENUM ('PENDING', 'WAIT_REMAINING', 'CLOSE_SHORT', 'RETURN_TO_VENDOR', 'KEEP_EXCESS', 'REPLACE_ITEM', 'REFUND');

-- AlterTable
ALTER TABLE "inbound_items" ADD COLUMN     "acceptedQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "discrepancyAction" "DiscrepancyResolution",
ADD COLUMN     "discrepancyDocumentUrl" TEXT,
ADD COLUMN     "discrepancyReason" TEXT,
ADD COLUMN     "discrepancyType" "InboundDiscrepancyType" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "rejectedQuantity" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "inbounds" ADD COLUMN     "proofDocumentUrl" TEXT;
