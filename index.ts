import { App } from "octokit";
import { createNodeMiddleware } from "@octokit/webhooks";
import * as fs from "fs";
import * as http from "http";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient();

const appId = process.env.GITHUB_APP_ID!;
const privateKey = process.env.PRIVATE_KEY!;
const webhookSecret = process.env.WEBHOOK_SECRET!;

const port = process.env.PORT || 3000;

if (!appId || !privateKey) {
  throw new Error("GITHUB_APP_ID and PRIVATE_KEY must be set");
}
const app = new App({
  appId: appId,
  privateKey: privateKey,
  webhooks: {
    secret: webhookSecret,
  },
});

// Add this type for better TypeScript support
type WebhookPayload = {
  installation: { id: number; account: { login: string,email:string } };
  repositories: Array<{ name: string; full_name: string; html_url: string }>;
};

// Remember to turn the creations into a transaction
async function handleInstallation(installation: any, repositories: any[]) {
  try {
    const installationClient = await app.getInstallationOctokit(installation.id);
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
          'GET /repos/{owner}/{repo}/commits',
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
    console.error('Error in handleInstallation:', error);
    throw error; // Re-throw the error to ensure the webhook handler knows about the failure
  }
}

// Add webhook listener
app.webhooks.on('installation.created', async ({ payload }) => {
  console.log("Installation created");
  console.log(payload.repositories);
  const typedPayload = payload as unknown as WebhookPayload;
  await handleInstallation(
    typedPayload.installation,
    typedPayload.repositories
  );
});

const middleware = createNodeMiddleware(app.webhooks, {
  path: "/api/webhook",
});

// Uncomment and modify the server creation
http.createServer(middleware).listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
