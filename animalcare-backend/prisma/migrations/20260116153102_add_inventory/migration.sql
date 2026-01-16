-- CreateTable
CREATE TABLE "FeedItem" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'g',
    "reorderRule" TEXT,
    "minOrderKg" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "stockGrams" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedRation" (
    "id" SERIAL NOT NULL,
    "feedItemId" INTEGER NOT NULL,
    "species" TEXT NOT NULL,
    "gramsPerAnimalPerDay" INTEGER NOT NULL,
    "animalCount" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedRation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" SERIAL NOT NULL,
    "feedItemId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "deltaGrams" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "refType" TEXT,
    "refId" INTEGER,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeedItem_name_key" ON "FeedItem"("name");

-- CreateIndex
CREATE INDEX "FeedRation_species_idx" ON "FeedRation"("species");

-- AddForeignKey
ALTER TABLE "FeedRation" ADD CONSTRAINT "FeedRation_feedItemId_fkey" FOREIGN KEY ("feedItemId") REFERENCES "FeedItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_feedItemId_fkey" FOREIGN KEY ("feedItemId") REFERENCES "FeedItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
