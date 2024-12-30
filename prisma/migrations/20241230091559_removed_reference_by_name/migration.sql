/*
  Warnings:

  - You are about to drop the column `repoName` on the `Commit` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Repo` table. All the data in the column will be lost.
  - Added the required column `repoId` to the `Commit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerId` to the `Repo` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Commit" DROP CONSTRAINT "Commit_repoName_fkey";

-- DropForeignKey
ALTER TABLE "Repo" DROP CONSTRAINT "Repo_userId_fkey";

-- AlterTable
ALTER TABLE "Commit" DROP COLUMN "repoName",
ADD COLUMN     "repoId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Repo" DROP COLUMN "userId",
ADD COLUMN     "ownerId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Repo" ADD CONSTRAINT "Repo_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commit" ADD CONSTRAINT "Commit_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
