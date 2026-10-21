export type TrackedRepo = {
  fullName: string;
  /** Branch to report on. Undefined means the repo default branch. */
  branch?: string;
};

export interface UserRecord {
  discordId: string;
  giteaLogin: string;
  giteaToken: string;
  repos: TrackedRepo[];
}

export interface ICryptoService {
  encrypt(plaintext: string): string;
  decrypt(ciphertextB64: string): string;
}

export interface IUsersService {
  register(
    discordId: string,
    giteaLogin: string,
    giteaToken: string,
  ): Promise<void>;
  getUser(discordId: string): Promise<UserRecord | undefined>;
  addRepo(discordId: string, fullName: string, branch?: string): Promise<void>;
  removeRepo(discordId: string, fullName: string): Promise<void>;
  listRepos(discordId: string): Promise<TrackedRepo[]>;
  listAllUsers(): Promise<UserRecord[]>;
}
