import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { SessionKey } from '../../src/core/contracts/runtime.js';
import { RUNTIME_GITIGNORE_CONTENT, sessionLedgerHash, sessionLedgerPath } from '../../src/infrastructure/runtime/runtime-paths.js';

function key(overrides: Partial<SessionKey> = {}): SessionKey {
  return { harness: 'claude-code', sessionId: 'session-1', agentId: null, ...overrides };
}
function expectedHash(sessionId: string, agentId: string | null): string {
  return createHash('sha256').update(`${sessionId}\0${agentId ?? ''}`).digest('hex').slice(0, 32);
}

describe('runtime path resolution (RF2, RF4, DEC-04, TC-08, TC-10)', () => {
  it('hashes the session and agent identifiers into thirty-two hex characters', () => {
    expect(sessionLedgerHash(key())).toMatch(/^[a-f0-9]{32}$/);
    expect(sessionLedgerHash(key())).toBe(expectedHash('session-1', null));
  });
  it('separates a subagent from the main session and keeps repeated keys stable', () => {
    expect(sessionLedgerHash(key({ agentId: 'sub-1' }))).toBe(expectedHash('session-1', 'sub-1'));
    expect(sessionLedgerHash(key({ agentId: 'sub-1' }))).not.toBe(sessionLedgerHash(key()));
    expect(sessionLedgerHash(key())).toBe(sessionLedgerHash(key()));
  });
  it('resolves the ledger inside the runtime sessions directory of the project root', () => {
    const root = resolve('/repo');
    expect(sessionLedgerPath(root, key())).toBe(join(root, '.context-brake', 'runtime', 'sessions', 'claude-code', `${expectedHash('session-1', null)}.jsonl`));
  });
  it('ignores the whole runtime directory through a single LF-terminated gitignore line', () => {
    expect(RUNTIME_GITIGNORE_CONTENT).toBe('*\n');
  });
});
