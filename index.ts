import { App } from "octokit";
import { createNodeMiddleware } from "@octokit/webhooks";
import * as http from "http";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { Repository, WebhookPayload } from "./types";
import { handleInstallation, handlePush } from "./event-handler";

dotenv.config();

const prisma = new PrismaClient();

const appId = process.env.GITHUB_APP_ID!;
const privateKey = process.env.PRIVATE_KEY!;
const webhookSecret = process.env.WEBHOOK_SECRET!;

//Port for the server
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
  try {
    console.log("Installation created");
    
    const typedPayload = payload as unknown as WebhookPayload;
    handleInstallation(
      app,
      prisma,
      typedPayload.installation,
      typedPayload.repositories as Repository[],
      
    );
    console.log("Installation handling completed successfully");
  } catch (error) {
    console.error("Error in installation webhook handler:", error);
    
  }
});

app.webhooks.on("push", async ({ payload }) => {
  handlePush(app, prisma, payload);
  
});


const middleware = createNodeMiddleware(app.webhooks, {
  path: "/api/webhook",
});

// Update your server startup
http.createServer(middleware).listen(port, () => {
  console.log(`Server listening on port ${port}`);
});




