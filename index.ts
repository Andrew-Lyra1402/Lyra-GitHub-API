import { App } from "octokit";
import { createNodeMiddleware } from "@octokit/webhooks";
import * as http from "http";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { WebhookPayload } from "./types";
import { handleInstallation } from "./event-handler";

dotenv.config();

const prisma = new PrismaClient();

const appId = process.env.GITHUB_APP_ID!;
const privateKey = process.env.PRIVATE_KEY!;
const webhookSecret = process.env.WEBHOOK_SECRET!;

const port = process.env.PORT || 3000;

if (!appId || !privateKey) {
  throw new Error("GITHUB_APP_ID and PRIVATE_KEY must be set");
}
//Init a new Octokit app
const app = new App({
  appId: appId,
  privateKey: privateKey,
  webhooks: {
    secret: webhookSecret,
  },
});

// Add webhook listener
app.webhooks.on('installation.created', async ({ payload }) => {
  console.log("Installation created");
  console.log(payload.repositories);
  const typedPayload = payload as unknown as WebhookPayload;
  await handleInstallation(
    app,
    prisma,
    typedPayload.installation,
    typedPayload.repositories
  );
});

const middleware = createNodeMiddleware(app.webhooks, {
  path: "/api/webhook",
});

// Create server
http.createServer(middleware).listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
