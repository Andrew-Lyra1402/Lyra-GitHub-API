/*
  Warnings:

  - You are about to drop the column `commiter` on the `Commit` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Commit" DROP COLUMN "commiter",
ADD COLUMN     "committer" TEXT;
