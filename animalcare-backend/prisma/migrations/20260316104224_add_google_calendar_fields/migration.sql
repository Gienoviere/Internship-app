-- AlterTable
ALTER TABLE "User" ADD COLUMN     "googleAccessToken" TEXT,
ADD COLUMN     "googleExpiry" TIMESTAMP(3),
ADD COLUMN     "googleRefreshToken" TEXT;
