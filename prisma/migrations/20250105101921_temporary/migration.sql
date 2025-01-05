-- CreateTable
CREATE TABLE "SlackAndGithubUser" (
    "id" TEXT NOT NULL,
    "slackUserName" TEXT NOT NULL,
    "githubUserName" TEXT NOT NULL,

    CONSTRAINT "SlackAndGithubUser_pkey" PRIMARY KEY ("id")
);
