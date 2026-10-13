export interface UserRecord {
  discordId: string;
  giteaLogin: string;
  giteaToken: string;
  repos: string[];
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
  addRepo(discordId: string, fullName: string): Promise<void>;
  removeRepo(discordId: string, fullName: string): Promise<void>;
  listRepos(discordId: string): Promise<string[]>;
  listAllUsers(): Promise<UserRecord[]>;
}
