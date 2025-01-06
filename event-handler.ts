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
        const { data: detailedCommit } =
          await installationClient.request<DetailedCommit>(
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
        console.error(
          `Error updating stats for commit ${commit.commitHash}:`,
          error
        );
        continue;
      }
    }
  } catch (error) {
    console.error(`Error in updateCommitStats for ${repoName}:`, error);
  }
}

export async function handleAddRepositories(
  app: App,
  prisma: PrismaClient,
  installation: InstallationPayload["installation"],
  repositories: Repository[]
): Promise<void> {
  try {
    const installationClient: Octokit = await app.getInstallationOctokit(
      installation.id
    );
    const account: { login: string } = installation.account;

    // Map to store commits for each repository
    const repoCommitsMap: Map<Repository, DetailedCommit[]> = new Map();

    for (const repo of repositories) {
      try {
        console.log("fetching commits for repo ", repo.name);
        
        // First get all branches
        const { data: branches } = await installationClient.request(
          "GET /repos/{owner}/{repo}/branches",
          {
            owner: account.login,
            repo: repo.name,
            per_page: 1000,
          }
        );

        // Fetch commits for each branch and combine them
        const allCommits: DetailedCommit[] = [];
        for (const branch of branches) {
          const { data: branchCommits } = await installationClient.request<DetailedCommit[]>(
            "GET /repos/{owner}/{repo}/commits",
            {
              owner: account.login,
              repo: repo.name,
              sha: branch.name,
              per_page: 1000,
            }
          );
          allCommits.push(...branchCommits);
        }

        // Remove duplicate commits (same SHA)
        const uniqueCommits = Array.from(
          new Map(allCommits.map(commit => [commit.sha, commit])).values()
        );
        
        console.log("completed fetching commits for repo ", repo.name);
        // Only store commits with less than 2 parents (non-merge commits)
        const nonMergeCommits = uniqueCommits.filter((commit: any) => !commit.parents || commit.parents.length <= 1);
        repoCommitsMap.set(repo, nonMergeCommits);
      } catch (error) {
        console.log("error fetching commits for repo ", repo.name, error);
      }
    }

    interface TransactionResult {
      commits: Commit[];
      repos: Repo[];
    }

    const user: User = await prisma.user.upsert({
      where: { GitHubUsername: account.login },
      create: { GitHubUsername: account.login },
      update: {},
    });

    const createdCommits: TransactionResult = await prisma.$transaction(
      async (ctx) => {
        const repoRecords: Repo[] = await ctx.repo.createManyAndReturn({
          data: repositories.map((repo: Repository) => ({
            name: repo.name,
            fullName: repo.full_name,
            url: `https://github.com/${repo.full_name}`,
            userId: user.id,
          })),
        });

        const repoNameToId: Map<string, string> = new Map(
          repoRecords.map((repo) => [repo.name, repo.id])
        );

        // Collect unique authors from commits
        const uniqueAuthors = new Set<string>();
        repositories.forEach(repo => {
          const commits = repoCommitsMap.get(repo) || [];
          commits.forEach(commit => {
            if (commit.author?.login) uniqueAuthors.add(commit.author.login);
          });
        });

        // Upsert all authors
        await ctx.user.createMany({
          data: Array.from(uniqueAuthors).map(username => ({
            GitHubUsername: username
          })),
          skipDuplicates: true
        });

        const allCommitsData: Omit<Commit, "id">[] = repositories.flatMap(
          (repo) => {
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
          }
        );

        const createdCommits: Commit[] = (await ctx.commit.createManyAndReturn({
          data: allCommitsData,
        })) as Commit[];

        return { commits: createdCommits, repos: repoRecords };
      }
    );

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

    const installationClient = await app.getInstallationOctokit(
      payload.installation.id
    );

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
        fullName: payload.repository.full_name,
        url: payload.repository.html_url,
        userId: user.id,
      },
      update: {},
    });

    // Process new commits
    
    const commits = await prisma.commit.createManyAndReturn({
      data: payload.commits
        .filter((commit: any) => !commit.parents || commit.parents.length <= 1)
        .map((commit: any) => ({
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

    // Update commit stats for the new commits
    await updateCommitStats(
      installationClient,
      prisma,
      payload.repository.owner.login,
      payload.repository.name,
      commits
    );

    console.log(`Successfully processed ${commits.length} new commits`);
  } catch (error) {
    console.error("Error in handlePush:", error);
  }
}

export async function handleInstallationDeleted(
  app: App,
  prisma: PrismaClient,
  payload: any
): Promise<void> {
  try {
    console.log("Installation deleted event received");
    const username = payload.installation.account.login;

    // Use transaction to ensure all deletions happen atomically
    await prisma.$transaction(async (tx) => {
      // Find the user
      const user = await tx.user.findUnique({
        where: { GitHubUsername: username },
        include: { repos: true },
      });

      if (!user) {
        console.log(`No user found for username: ${username}`);
        return;
      }
      // Delete all commits associated with user's repos
      await tx.commit.deleteMany({
        where: {
          repoId: {
            in: user.repos.map((repo) => repo.id),
          },
        },
      });

      // Delete all repos associated with the user
      await tx.repo.deleteMany({
        where: { userId: user.id },
      });
      
    });

    console.log(`Successfully deleted all data for user: ${username}`);
  } catch (error) {
    console.error("Error in handleInstallationDeleted:", error);
    
  }
}

export async function handleInstallationRepositoriesAdded(
  app: App,
  prisma: PrismaClient,
  payload: any
): Promise<void> {
  try {
    console.log("Installation repositories added event received");
    await handleAddRepositories(
      app,
      prisma,
      payload.installation,
      payload.repositories_added as Repository[]
    );
    console.log("New repositories processed successfully");
  } catch (error) {
    console.error("Error in handleInstallationRepositoriesAdded:", error);
    
  }
}

export async function handleInstallationRepositoriesRemoved(
  app: App,
  prisma: PrismaClient,
  payload: any
): Promise<void> {
  try {
    console.log("Installation repositories removed event received");
    const removedRepos = payload.repositories_removed;

    if (!removedRepos || removedRepos.length === 0) {
      console.log("No repositories to remove");
      return;
    }

    // Use transaction to ensure atomic deletion
    await prisma.$transaction(async (tx) => {
      const repoNames = removedRepos.map((repo: Repository) => repo.full_name);

      // Find repos in our database
      const repos = await tx.repo.findMany({
        where: {
          fullName: {
            in: repoNames,
          },
        },
      });

      // Delete all commits for these repos
      await tx.commit.deleteMany({
        where: {
          repoId: {
            in: repos.map((repo) => repo.id),
          },
        },
      });

      // Delete the repos
      await tx.repo.deleteMany({
        where: {
          id: {
            in: repos.map((repo) => repo.id),
          },
        },
      });
    });

    console.log(
      `Successfully removed ${removedRepos.length} repositories and their commits`
    );
  } catch (error) {
    console.error("Error in handleInstallationRepositoriesRemoved:", error);
    
  }
}