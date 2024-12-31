import { App } from "@octokit/app";
import { Commit, PrismaClient, Repo, User } from "@prisma/client";
import { Octokit } from "octokit";
import { InstallationPayload, Repository, DetailedCommit } from "./types";

export async function updateCommitStats(
  installationClient: Octokit,
  prisma: PrismaClient,
  owner: string,
  repoName: string,
  commits: Commit[]
): Promise<void> {
  try {
    for (const commit of commits) {
      try {
        const { data: detailedCommit } = await installationClient.request<DetailedCommit>(
          "GET /repos/{owner}/{repo}/commits/{ref}",
          {
            owner,
            repo: repoName,
            ref: commit.commitHash!,
          }
        );

        await prisma.commit.update({
          where: {
            id: commit.id,
          },
          data: {
            numberOfLinesAdded: detailedCommit.stats?.additions || 0,
            numberOfLinesRemoved: detailedCommit.stats?.deletions || 0,
          },
        });
      } catch (error) {
        console.error(`Error updating stats for commit ${commit.commitHash}:`, error);
        continue;
      }
    }
  } catch (error) {
    console.error(`Error in updateCommitStats for ${repoName}:`, error);
    
  }
}

export async function handleInstallation(
  app: App,
  prisma: PrismaClient,
  installation: InstallationPayload["installation"],
  repositories: Repository[]
): Promise<void> {
  try {
    const installationClient: Octokit = await app.getInstallationOctokit(installation.id);
    const account: { login: string } = installation.account;

    // Map to store commits for each repository
    const repoCommitsMap: Map<Repository, DetailedCommit[]> = new Map();

    for (const repo of repositories) {
      try {
        console.log("fetching commits for repo ", repo.name);
        const { data: commits } = await installationClient.request<DetailedCommit[]>(
          "GET /repos/{owner}/{repo}/commits",
          {
            owner: account.login,
            repo: repo.name,
            per_page: 1000,
          }
        );
        console.log("completed fetching commits for repo ", repo.name);
        repoCommitsMap.set(repo, commits);
      } catch (error) {
        console.log("error fetching commits for repo ", repo.name, error);
      }
    }

    interface TransactionResult {
      commits: Commit[];
      repos: Repo[];
    }

    const user: User = await prisma.user.create({
      data: {
        GitHubUsername: account.login,
      },
    });
    
    const createdCommits: TransactionResult = await prisma.$transaction(async (ctx) => {
      const repoRecords: Repo[] = await ctx.repo.createManyAndReturn({
        data: repositories.map((repo: Repository) => ({
          name: repo.name,
          url: `https://github.com/${repo.full_name}`,
          userId: user.id,
        })),
      });

      const repoNameToId: Map<string, string> = new Map(
        repoRecords.map((repo) => [repo.name, repo.id])
      );

      const allCommitsData: Omit<Commit, 'id'>[] = repositories.flatMap((repo) => {
        const commits = repoCommitsMap.get(repo) || [];
        return commits.map((commit: DetailedCommit) => ({
          message: commit.commit.message,
          repoId: repoNameToId.get(repo.name)!,
          commitHash: commit.sha,
          author: commit.author?.login || null,
          committer: commit.committer?.login || null,
          timestamp: new Date(commit.commit.committer.date),
          numberOfLinesAdded: null,
          numberOfLinesRemoved: null,
        }));
      });

      const createdCommits: Commit[] = await ctx.commit.createManyAndReturn({
        data: allCommitsData,
      }) as Commit[];

      return { commits: createdCommits, repos: repoRecords };
    });

    console.log("Updating commit stats...");
    await Promise.all(
      createdCommits.repos.map(async (repo: Repo) => {
        const repoCommits: Commit[] = createdCommits.commits.filter(
          (commit) => commit.repoId === repo.id
        );
        await updateCommitStats(
          installationClient,
          prisma,
          account.login,
          repo.name,
          repoCommits
        );
      })
    );
    console.log("Commit stats update completed");

  } catch (error) {
    console.error("Error in handleInstallation:", error);
    
  }
}

export async function handlePush(
  app: App,
  prisma: PrismaClient,
  payload: any
): Promise<void> {
  try {
    console.log("Push event received for repository:", payload.repository.name);
    
    const installationClient = await app.getInstallationOctokit(payload.installation.id);
    
    // Get or create user
    const user = await prisma.user.upsert({
      where: { GitHubUsername: payload.sender.login },
      create: { GitHubUsername: payload.sender.login },
      update: {},
    });

    // Get or create repository
    const repo = await prisma.repo.upsert({
      where: { url: payload.repository.html_url },
      create: {
        name: payload.repository.name,
        url: payload.repository.html_url,
        userId: user.id,
      },
      update: {},
    });

    // Process new commits
    const newCommits = await prisma.$transaction(async (ctx) => {
      const commits = await ctx.commit.createManyAndReturn({
        data: payload.commits.map((commit:any) => ({
          message: commit.message,
          repoId: repo.id,
          commitHash: commit.id,
          author: commit.author.username || null,
          committer: commit.committer.username || null,
          timestamp: new Date(commit.timestamp),
          numberOfLinesAdded: null,
          numberOfLinesRemoved: null,
        })),
      });

      return commits;
    });

    // Update commit stats for the new commits
    await updateCommitStats(
      installationClient,
      prisma,
      payload.repository.owner.name,
      payload.repository.name,
      newCommits
    );

    console.log(`Successfully processed ${newCommits.length} new commits`);
  } catch (error) {
    console.error("Error in handlePush:", error);
    
  }
}