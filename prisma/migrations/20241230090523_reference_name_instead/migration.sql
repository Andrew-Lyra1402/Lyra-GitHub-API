/*
  Warnings:

  - You are about to drop the column `repoId` on the `Commit` table. All the data in the column will be lost.
  - Added the required column `repoName` to the `Commit` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Commit" DROP CONSTRAINT "Commit_repoId_fkey";

-- AlterTable
ALTER TABLE "Commit" DROP COLUMN "repoId",
ADD COLUMN     "repoName" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Commit" ADD CONSTRAINT "Commit_repoName_fkey" FOREIGN KEY ("repoName") REFERENCES "Repo"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
