/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Repo` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[url]` on the table `Repo` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[GitHubUsername]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Repo_name_key" ON "Repo"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Repo_url_key" ON "Repo"("url");

-- CreateIndex
CREATE UNIQUE INDEX "User_GitHubUsername_key" ON "User"("GitHubUsername");
