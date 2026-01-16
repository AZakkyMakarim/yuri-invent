-- AlterTable
ALTER TABLE "purchase_requests" ADD COLUMN     "estimatedShippingDate" TIMESTAMP(3),
ADD COLUMN     "poDocumentPath" TEXT,
ADD COLUMN     "shippingTrackingNumber" TEXT;
