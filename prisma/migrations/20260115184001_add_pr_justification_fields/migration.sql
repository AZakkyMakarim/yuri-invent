-- AlterTable
ALTER TABLE "purchase_requests" ADD COLUMN     "justificationDocument" TEXT,
ADD COLUMN     "justificationReason" TEXT,
ADD COLUMN     "requiresJustification" BOOLEAN NOT NULL DEFAULT false;
