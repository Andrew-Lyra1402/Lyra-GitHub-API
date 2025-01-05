/*
  Warnings:

  - You are about to drop the column `slackUserName` on the `SlackAndGithubUser` table. All the data in the column will be lost.
  - Added the required column `slackUserId` to the `SlackAndGithubUser` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SlackAndGithubUser" DROP COLUMN "slackUserName",
ADD COLUMN     "slackUserId" TEXT NOT NULL;
