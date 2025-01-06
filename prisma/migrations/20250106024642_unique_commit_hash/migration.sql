/*
  Warnings:

  - A unique constraint covering the columns `[commitHash]` on the table `Commit` will be added. If there are existing duplicate values, this will fail.
  - Made the column `commitHash` on table `Commit` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Commit" ALTER COLUMN "commitHash" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Commit_commitHash_key" ON "Commit"("commitHash");
