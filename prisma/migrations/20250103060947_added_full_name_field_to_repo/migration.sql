/*
  Warnings:

  - A unique constraint covering the columns `[fullName]` on the table `Repo` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fullName` to the `Repo` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Commit_commitHash_key";

-- DropIndex
DROP INDEX "Repo_name_key";

-- AlterTable
ALTER TABLE "Repo" ADD COLUMN     "fullName" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Repo_fullName_key" ON "Repo"("fullName");
