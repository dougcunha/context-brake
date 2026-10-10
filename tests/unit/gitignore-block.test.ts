import { describe, expect, it } from 'vitest';
import { applyIgnoreBlock, BLOCK_END, BLOCK_START, MALFORMED_MARKERS_MESSAGE, removeIgnoreBlock } from '../../src/core/services/gitignore-block.js';

const LINES = ['/context-brake.config.json', '/.context-brake/manifest.json'];
const BLOCK = [BLOCK_START, ...LINES, BLOCK_END].join('\n');
const X_BLOCK = [BLOCK_START, '/x', BLOCK_END].join('\n');

function applied(content: string | null, lines: readonly string[] = LINES): string | null {
  const result = applyIgnoreBlock(content, lines);
  expect(result).not.toHaveProperty('error');
  return 'content' in result ? result.content : null;
}

describe('applyIgnoreBlock adds and replaces the managed block (prd-17 FR-04, NFR-01, TC-01)', () => {
  it('creates the block alone for a missing or empty file (FR-04, TC-01)', () => {
    expect(applied(null)).toBe(`${BLOCK}\n`);
    expect(applied('')).toBe(`${BLOCK}\n`);
  });
  it('appends after the user lines with one blank line and keeps them byte for byte (FR-04, TC-01)', () => {
    const user = '# mine\nnode_modules/\n\ndist/\n';
    expect(applied(user)).toBe(`${user}\n${BLOCK}\n`);
  });
  it('adds one line break before the block when the last line has none, and remove leaves it (OI-01, TC-01)', () => {
    const once = applied('dist/');
    expect(once).toBe(`dist/\n\n${BLOCK}\n`);
    expect(removeIgnoreBlock(once)).toEqual({ content: 'dist/\n' });
  });
  it('writes the block with CRLF in a CRLF file and leaves the user bytes alone (NFR-01, TC-01)', () => {
    const user = 'dist/\r\n# c\r\n';
    expect(applied(user)).toBe(`${user}\r\n${BLOCK.replaceAll('\n', '\r\n')}\r\n`);
  });
  it('replaces an existing block in place and is idempotent (FR-02, NFR-01, TC-01)', () => {
    const once = applied('a/\n') ?? '';
    const changed = applied(once, ['/only.json']) ?? '';
    expect(changed).toBe(`a/\n\n${[BLOCK_START, '/only.json', BLOCK_END].join('\n')}\n`);
    expect(applied(once)).toBe(once);
  });
  it('keeps the text around a block placed right after a user line when it is replaced or removed (FR-04, FR-06, TC-01)', () => {
    const text = `a/\n\nb/\n${BLOCK}\nz/\n`;
    expect(applied(text, ['/x'])).toBe(`a/\n\nb/\n${X_BLOCK}\nz/\n`);
    expect(removeIgnoreBlock(text)).toEqual({ content: 'a/\n\nb/\nz/\n' });
  });
});

describe('removeIgnoreBlock and malformed markers (prd-17 FR-04, FR-06, TC-01)', () => {
  it.each([['a/\n'], ['a/\n\n\n'], ['# only a comment\r\nb/\r\n']])('restores %j after apply then remove (FR-06, TC-01)', (original) => {
    const result = removeIgnoreBlock(applied(original));
    expect(result).toEqual({ content: original });
  });
  it('returns null content when only the block was there, and the text when there is no block (FR-06, TC-01)', () => {
    expect(removeIgnoreBlock(applied(null))).toEqual({ content: null });
    expect(removeIgnoreBlock('dist/\n')).toEqual({ content: 'dist/\n' });
    expect(removeIgnoreBlock(null)).toEqual({ content: null });
  });
  it('removes the block when no lines are left to list (FR-02, TC-01)', () => {
    expect(applyIgnoreBlock(applied('a/\n'), [])).toEqual({ content: 'a/\n' });
  });
  it.each([
    [`${BLOCK_START}\n/a\n`],
    [`/a\n${BLOCK_END}\n`],
    [`${BLOCK_END}\n/a\n${BLOCK_START}\n`],
    [`${BLOCK}\n${BLOCK}\n`],
    [`${BLOCK_START}\n${BLOCK}\n`],
    [`${BLOCK}\n${BLOCK_END}\n`],
  ])('reports malformed markers and changes nothing for %j (FR-04, TC-01)', (text) => {
    expect(applyIgnoreBlock(text, LINES)).toEqual({ error: MALFORMED_MARKERS_MESSAGE });
    expect(removeIgnoreBlock(text)).toEqual({ error: MALFORMED_MARKERS_MESSAGE });
  });
});
