import { describe, expect, it } from 'vitest';
import { isValidBranch } from '../src/shared/branch.js';

describe('isValidBranch', () => {
  it('accepts normal branch names', () => {
    for (const good of [
      'main',
      'develop',
      'feature/ABC-123',
      'release-1.2',
      'a'.repeat(100),
    ]) {
      expect(isValidBranch(good)).toBe(true);
    }
  });

  it('rejects unsafe or malformed names', () => {
    for (const bad of [
      '',
      '../etc/passwd',
      'feature/../../main',
      'feature//x',
      '/main',
      'main/',
      '-main',
      'main.lock',
      'a'.repeat(101),
      'main;rm -rf',
      'main branch',
      'feature/x?limit=1',
    ]) {
      expect(isValidBranch(bad)).toBe(false);
    }
  });
});
