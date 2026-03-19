-- AlterTable
ALTER TABLE "DailyLog" ADD COLUMN     "ApprovalStatus" TEXT,
ADD COLUMN     "completedSubtasks" JSONB,
ADD COLUMN     "photoUrl" TEXT,
ALTER COLUMN "completed" SET DEFAULT false;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "animalCategory" TEXT,
ADD COLUMN     "photoRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subtasks" JSONB;

-- CreateIndex
CREATE INDEX "Task_animalCategory_idx" ON "Task"("animalCategory");

-- CreateIndex
CREATE INDEX "Task_category_idx" ON "Task"("category");

-- CreateIndex
CREATE INDEX "Task_feedItemId_idx" ON "Task"("feedItemId");
