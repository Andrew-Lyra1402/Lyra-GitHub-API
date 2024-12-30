// Payload types
export type WebhookPayload = {
  installation: { id: number; account: { login: string; email: string } };
  repositories: Array<{ name: string; full_name: string }>;
};
