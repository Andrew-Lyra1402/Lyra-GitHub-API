//TODO: Add seed data for users when a new feature is added
//NOTE: For each operation on the database done normally, there is a corresponding function here that grab the user details and perform the operations
/*
Eg, when we start tracking the creation of repos, we need to add the repos to the database, so we add a function here that grabs
the user details and adds the repos to the database
*/

import { PrismaClient } from "@prisma/client";
import { writeFile } from 'fs/promises';
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";

export async function removeDuplicatedCommits() {
  const prisma = new PrismaClient();
  
  // Get all commit hashes that have duplicates
  const duplicateHashes = await prisma.commit.groupBy({
    by: ['commitHash'],
    having: {
      commitHash: {
        _count: {
          gt: 1
        }
      }
    },
    where: {
      commitHash: {
        not: null
      }
    }
  });

  // For each duplicate hash, keep the first one and delete the rest
  for (const { commitHash } of duplicateHashes) {
    const commits = await prisma.commit.findMany({
      where: { commitHash },
      orderBy: { timestamp: 'asc' }
    });
    
    if (commits.length > 1) {
      await prisma.commit.deleteMany({
        where: {
          id: {
            in: commits.slice(1).map(c => c.id)
          }
        }
      });
    }
  }
}

export async function listCommitsForUser(username: string) {
  const prisma = new PrismaClient();
  const commits = await prisma.commit.findMany({
    where: { 
      author: username,
      timestamp: {
        gte: new Date(new Date().getTime() - 1000 * 60 * 60 * 24)
      }
    }
  });
  
  return commits;
}
const getLatestCommit = async () => {
  const prisma = new PrismaClient();
  const commits = await prisma.commit.findFirst({
    orderBy: { timestamp: 'desc' },
  });
  return commits;
}
const findCommitWithMerge = async () => {
  const prisma = new PrismaClient();
  const commits = await prisma.commit.findMany({
    where: { message: { contains: "Merge" } },
  });
  return commits;
}
const removeMergeCommits = async () => {
  const prisma = new PrismaClient();
  const commits = await prisma.commit.deleteMany({
    where: { message: { contains: "Merge" } },
  });
  return commits;
}

// getLatestCommit().then(async (commits) => {
//   const content = JSON.stringify(commits, null, 2); // Pretty print JSON
//   await writeFile('commits.txt', content);
// }).catch(error => {
//   console.error('Error writing commits to file:', error);
// });
// listCommitsForUser("anthnykr").then(async (commits) => {
//   const content = JSON.stringify(commits, null, 2); // Pretty print JSON
//   await writeFile('commits.txt', content);
// }).catch(error => {
//   console.error('Error writing commits to file:', error);
// });

// removeMergeCommits().then(async (commits) => {
//   const content = JSON.stringify(commits, null, 2); // Pretty print JSON
//   await writeFile('commits.txt', content);
// });

findCommitWithMerge().then(async (commits) => {
  const content = JSON.stringify(commits, null, 2); // Pretty print JSON
  await writeFile('commits.txt', content);
});


const getCommitByHash = async (hash: string, owner: string, repo: string) => {
  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: process.env.GITHUB_APP_ID!,
      privateKey: process.env.GITHUB_PRIVATE_KEY!,
    },
  });

  try {
    // Get the installation for this repository
    const { data: installation } = await octokit.apps.getRepoInstallation({
      owner,
      repo,
    });

    // Create a new Octokit instance with the installation token
    const installationOctokit = new Octokit({
      auth: await octokit.auth({
        type: "installation",
        installationId: installation.id,
      }),
    });

    const { data: commit } = await installationOctokit.repos.getCommit({
      owner,
      repo,
      ref: hash,
    });
    return commit;
  } catch (error) {
    console.error('Error fetching commit:', error);
    return null;
  }
}
