import { PrismaClient } from "@prisma/client";

export async function seedCommits(prisma: PrismaClient) {
  const commits = await prisma.commit.findMany();
  return commits;
}
