/*
  Warnings:

  - The primary key for the `Commit` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Commit` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Commit" DROP CONSTRAINT "Commit_pkey",
ADD COLUMN     "author" TEXT,
ADD COLUMN     "commitHash" TEXT,
ADD COLUMN     "timestamp" TIMESTAMP(3),
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Commit_pkey" PRIMARY KEY ("id");
