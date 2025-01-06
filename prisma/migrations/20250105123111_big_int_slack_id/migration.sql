/*
  Warnings:

  - The `slackUserId` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "slackUserId",
ADD COLUMN     "slackUserId" BIGINT;

-- CreateIndex
CREATE UNIQUE INDEX "User_slackUserId_key" ON "User"("slackUserId");
