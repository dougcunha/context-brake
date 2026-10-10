import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readRolloutUsage } from '../../src/infrastructure/harnesses/codex-cli/rollout-usage.js';

const FIXTURES = resolve('tests/fixtures/harnesses/codex-cli');

function tokenCountLine(input: { readonly at: string; readonly tokens: unknown; readonly window?: unknown }): string {
  const info = { total_token_usage: { total_tokens: 999_999 }, last_token_usage: { total_tokens: input.tokens }, model_context_window: input.window };
  return JSON.stringify({ timestamp: input.at, type: 'event_msg', payload: { type: 'token_count', info } });
}

let root: string;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-rollout-')); });
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('Codex CLI rollout usage reader', () => {
  it('returns the last turn tokens and model window of the latest token_count with info', async () => {
    expect(await readRolloutUsage(join(FIXTURES, 'rollout-token-count.jsonl'))).toEqual({ tokens: 78_260, contextWindow: 258_400, at: '2026-10-08T16:31:34.239Z' });
  });

  it('returns null when no token_count carries info', async () => {
    expect(await readRolloutUsage(join(FIXTURES, 'rollout-no-token-count.jsonl'))).toBeNull();
  });

  it('reports a null window when the event omits model_context_window', async () => {
    const path = join(root, 'rollout.jsonl');
    await writeFile(path, `${tokenCountLine({ at: '2026-10-08T10:00:00.000Z', tokens: 500 })}\n`, 'utf8');
    expect(await readRolloutUsage(path)).toEqual({ tokens: 500, contextWindow: null, at: '2026-10-08T10:00:00.000Z' });
  });
});

describe('Codex CLI rollout usage reader fallbacks', () => {
  it('returns null for a missing path', async () => {
    expect(await readRolloutUsage(undefined)).toBeNull();
  });

  it.each([
    ['non-numeric tokens', `${tokenCountLine({ at: '2026-10-08T10:00:00.000Z', tokens: '5' })}\n`],
    ['negative tokens', `${tokenCountLine({ at: '2026-10-08T10:00:00.000Z', tokens: -5 })}\n`],
    ['a zero window', `${tokenCountLine({ at: '2026-10-08T10:00:00.000Z', tokens: 5, window: 0 })}\n`],
    ['a torn last line that carries the token_count marker', tokenCountLine({ at: '2026-10-08T10:00:00.000Z', tokens: 5, window: 1000 }).slice(0, 90)],
  ])('returns null without throwing for %s', async (_label, content) => {
    const path = join(root, 'rollout.jsonl');
    await writeFile(path, content, 'utf8');
    await expect(readRolloutUsage(path)).resolves.toBeNull();
  });
});
