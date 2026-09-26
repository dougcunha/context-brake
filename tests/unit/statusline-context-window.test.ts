import { mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readClaudeContextWindow } from '../../src/infrastructure/harnesses/claude-code/statusline-context-window.js';

const SESSIONS = '.context-brake/runtime/sessions/claude-code';
const COMMAND = 'node "/repo/.claude/hooks/context-brake-statusline.mjs"';
let root = '';

async function write(path: string, content: unknown): Promise<void> {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), typeof content === 'string' ? content : JSON.stringify(content), 'utf8');
}
function statuslineLine(windowTokens: number | null): string {
  return `${JSON.stringify({ v: 1, type: 'statusline', at: '2026-09-25T12:00:00.000Z', windowTokens, inputTokens: null, usedPercentage: null, model: null })}\n`;
}
async function ledger(name: string, content: string, modifiedSeconds: number): Promise<void> {
  await write(`${SESSIONS}/${name}.jsonl`, content);
  await utimes(join(root, SESSIONS, `${name}.jsonl`), modifiedSeconds, modifiedSeconds);
}

beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-context-window-')); });
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('doctor context window section (FR-07, DEC-10, TC-17)', () => {
  it('reports an absent bridge and the ceiling without state or ledgers', async () => {
    expect(await readClaudeContextWindow(root)).toEqual({ bridge: 'absent', source: 'contextWindowCeiling', lastWindowTokens: null });
  });

  it('reports an installed bridge and the window of the most recently modified ledger', async () => {
    await write('.context-brake/runtime/claude-statusline.json', { v: 1, installedCommand: COMMAND, previousLocal: null, previousSource: null, previousCommand: null, createdLocalFile: true });
    await write('.claude/settings.local.json', { statusLine: { type: 'command', command: COMMAND } });
    await ledger('older', statuslineLine(200000), 1_000);
    await ledger('newer', statuslineLine(1000000) + statuslineLine(null), 2_000);
    expect(await readClaudeContextWindow(root)).toEqual({ bridge: 'installed', source: 'statusline', lastWindowTokens: 1000000 });
  });

  it('reports an inactive bridge when the local command differs', async () => {
    await write('.context-brake/runtime/claude-statusline.json', { v: 1, installedCommand: COMMAND, previousLocal: null, previousSource: null, previousCommand: null, createdLocalFile: true });
    await write('.claude/settings.local.json', { statusLine: { type: 'command', command: 'other.sh' } });
    expect((await readClaudeContextWindow(root)).bridge).toBe('inactive');
  });

  it('skips a newer ledger without a window, such as a subagent ledger (codereview_01/OI-01)', async () => {
    await ledger('main', statuslineLine(1000000), 1_000);
    await ledger('subagent', '', 2_000);
    expect(await readClaudeContextWindow(root)).toMatchObject({ source: 'statusline', lastWindowTokens: 1000000 });
  });

  it('falls back to the ceiling when no ledger has a window', async () => {
    await ledger('older', statuslineLine(null), 1_000);
    await ledger('newer', '', 2_000);
    expect(await readClaudeContextWindow(root)).toMatchObject({ source: 'contextWindowCeiling', lastWindowTokens: null });
  });
});
