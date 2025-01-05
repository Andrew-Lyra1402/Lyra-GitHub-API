/*
  Warnings:

  - You are about to drop the column `accessToken` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `refreshToken` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `SlackAndGithubUser` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[slackUserId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slackUserId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "accessToken",
DROP COLUMN "refreshToken",
ADD COLUMN     "slackUserId" TEXT;

-- DropTable
DROP TABLE "SlackAndGithubUser";

-- CreateIndex
CREATE UNIQUE INDEX "User_slackUserId_key" ON "User"("slackUserId");
