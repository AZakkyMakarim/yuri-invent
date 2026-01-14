/*
  Warnings:

  - You are about to drop the column `amount` on the `rab_lines` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `rab_lines` table. All the data in the column will be lost.
  - Added the required column `itemId` to the `rab_lines` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastStockSnapshot` to the `rab_lines` table without a default value. This is not possible if the table is not empty.
  - Added the required column `replenishQty` to the `rab_lines` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requiredQty` to the `rab_lines` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `rab_lines` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitPrice` to the `rab_lines` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "rab_lines" DROP COLUMN "amount",
DROP COLUMN "description",
ADD COLUMN     "itemId" TEXT NOT NULL,
ADD COLUMN     "lastStockSnapshot" INTEGER NOT NULL,
ADD COLUMN     "replenishQty" INTEGER NOT NULL,
ADD COLUMN     "requiredQty" INTEGER NOT NULL,
ADD COLUMN     "totalAmount" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "unitPrice" DECIMAL(18,2) NOT NULL;

-- AddForeignKey
ALTER TABLE "rab_lines" ADD CONSTRAINT "rab_lines_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
