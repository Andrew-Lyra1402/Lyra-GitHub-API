import { App } from "@octokit/app";
import { PrismaClient } from "@prisma/client";

// Used transaction to create user, repo and commits when first installing the app
export async function handleInstallation(
  app: App,
  prisma: PrismaClient,
  installation: any,
  repositories: any[]
) {
  try {
    const installationClient = await app.getInstallationOctokit(
      installation.id
    );
    const account = installation.account;

    // Wrap everything in a transaction
    await prisma.$transaction(async (tx) => {
      // Create or find user
      const user = await tx.user.create({
        data: {
          GitHubUsername: account.login,
        },
      });

      // Process each repository
      for (const repo of repositories) {
        // Create repo
        const createdRepo = await tx.repo.create({
          data: {
            name: repo.name,
            url: `https://github.com/${repo.full_name}`,
            userId: user.id,
          },
        });

        // Fetch and store commits
        const { data: commits } = await installationClient.request(
          "GET /repos/{owner}/{repo}/commits",
          {
            owner: account.login,
            repo: repo.name,
          }
        );

        // Store each commit
        for (const commit of commits) {
          await tx.commit.create({
            data: {
              message: commit.commit.message,
              repoId: createdRepo.id,
            },
          });
        }
      }
    });
  } catch (error) {
    console.error("Error in handleInstallation:", error);
    throw error; // Re-throw the error to ensure the webhook handler knows about the failure
  }
}
