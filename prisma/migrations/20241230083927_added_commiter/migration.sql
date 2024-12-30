-- AlterTable
ALTER TABLE "Commit" ADD COLUMN     "commiter" TEXT,
ADD COLUMN     "numberOfLinesAdded" INTEGER,
ADD COLUMN     "numberOfLinesRemoved" INTEGER;
