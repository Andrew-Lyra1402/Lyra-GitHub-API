//TODO: Add seed data for users when a new feature is added
//NOTE: For each operation on the database done normally, there is a corresponding function here that grab the user details and perform the operations
/*
Eg, when we start tracking the creation of repos, we need to add the repos to the database, so we add a function here that grabs
the user details and adds the repos to the database
*/

import { PrismaClient } from "@prisma/client";

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
