// Payload types
export type WebhookPayload = {
  installation: { id: number; account: { login: string; email: string } };
  repositories: Array<{ name: string; full_name: string }>;
};
export type Commit = {
  message: string;
  repoId: number;
  commitHash: string;
  author: string;
  committer: string;
  timestamp: string;
  numberOfLinesAdded?: number;
  numberOfLinesRemoved?: number;
};

export interface InstallationPayload {
  installation: {
    id: number;
    account: {
      login: string;
    };
  };
  repositories: Repository[];
}

export interface Repository {
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
}

export interface PushPayload {
  installation: {
    id: number;
  };
  repository: {
    name: string;
    owner: {
      login: string;
    };
  };
  commits: CommitPayload[];
}

export interface CommitPayload {
  id: string;
  message: string;
  timestamp: string;
  author: {
    name: string;
    login?: string;
  };
  committer: {
    name: string;
    login?: string;
  };
}

export interface DetailedCommit {
  stats: {
    additions: number;
    deletions: number;
  };
  sha: string;
  commit: {
    message: string;
    author: {
      date: string;
      name: string;
    };
    committer: {
      date: string;
      name: string;
    };
  };
  author: {
    login: string;
  } | null;
  committer: {
    login: string;
  } | null;
}