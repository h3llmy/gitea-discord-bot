const BRANCH_RE = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$/;

/** Git ref name check: keeps user input out of Gitea URLs and rejects traversal. */
export function isValidBranch(name: string): boolean {
  if (!BRANCH_RE.test(name)) return false;
  if (name.includes('..')) return false;
  if (name.includes('//')) return false;
  if (name.endsWith('/')) return false;
  if (name.endsWith('.lock')) return false;
  return true;
}
