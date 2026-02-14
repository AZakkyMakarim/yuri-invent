-- Manually created migration for InboundStatus enum change

-- AlterEnum
ALTER TYPE "InboundStatus" RENAME TO "InboundStatus_old";
CREATE TYPE "InboundStatus" AS ENUM ('PENDING', 'PARTIAL', 'COMPLETED', 'READY_FOR_PAYMENT', 'PAID');
ALTER TABLE "inbounds" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "inbounds" ALTER COLUMN "status" TYPE "InboundStatus" USING (
    CASE
        WHEN "status"::text = 'PENDING_VERIFICATION' THEN 'PENDING'::"InboundStatus"
        WHEN "status"::text = 'VERIFIED' THEN 'COMPLETED'::"InboundStatus"
        WHEN "status"::text = 'REJECTED' THEN 'COMPLETED'::"InboundStatus"
        ELSE 'PENDING'::"InboundStatus"
    END
);
ALTER TABLE "inbounds" ALTER COLUMN "status" SET DEFAULT 'PENDING';
DROP TYPE "InboundStatus_old";
