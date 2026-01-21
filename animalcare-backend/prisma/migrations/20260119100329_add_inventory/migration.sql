-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "affectsInventory" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "feedItemId" INTEGER;

-- CreateIndex
CREATE INDEX "InventoryMovement_date_idx" ON "InventoryMovement"("date");

-- CreateIndex
CREATE INDEX "InventoryMovement_feedItemId_idx" ON "InventoryMovement"("feedItemId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_feedItemId_fkey" FOREIGN KEY ("feedItemId") REFERENCES "FeedItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
