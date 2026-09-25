import { describe, expect, it } from 'vitest';
import { matchesAnyPathPattern, matchesPathPattern } from '../../src/core/services/path-pattern.js';

describe('path pattern matcher (TC-02, FR-06, NFR-04)', () => {
  it.each([
    ['tasks/prd-06/context-snapshot.md', 'tasks/**/context-snapshot.md'],
    ['tasks/a/b/context-snapshot.md', 'tasks/**/context-snapshot.md'],
    ['tasks/context-snapshot.md', 'tasks/**/context-snapshot.md'],
    ['notes/session.md', 'notes/*.md'],
    ['notes/a1.md', 'notes/a?.md'],
    ['state.json', 'state.json'],
    ['deep/any/file.txt', '**'],
  ])('matches %s against %s', (path, pattern) => expect(matchesPathPattern(path, pattern)).toBe(true));
  it.each([
    ['src/context-snapshot.md', 'tasks/**/context-snapshot.md'],
    ['notes/sub/session.md', 'notes/*.md'],
    ['notes/abc.md', 'notes/a?.md'],
    ['tasks/../secret.md', 'tasks/**'],
    ['tasks/./x.md', 'tasks/**'],
    ['statexjson', 'state.json'],
  ])('does not match %s against %s', (path, pattern) => expect(matchesPathPattern(path, pattern)).toBe(false));
  it('accepts a path when any pattern matches', () => {
    expect(matchesAnyPathPattern('b/x.md', ['a/*.md', 'b/*.md'])).toBe(true);
    expect(matchesAnyPathPattern('c/x.md', ['a/*.md', 'b/*.md'])).toBe(false);
    expect(matchesAnyPathPattern('c/x.md', [])).toBe(false);
  });
});
