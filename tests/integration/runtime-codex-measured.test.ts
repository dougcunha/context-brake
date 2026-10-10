import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { RuntimeEvent } from '../../src/core/contracts/runtime.js';
import { createBrakeEngine } from '../../src/core/services/brake-engine.js';
import { codexDescriptor, mapCodexEvent, mapCodexInput } from '../../src/infrastructure/harnesses/codex-cli/runtime.js';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { RecordingErrors, RecordingLedger } from '../helpers/recording-ledger.js';

const FIXTURES = resolve('tests/fixtures/harnesses/codex-cli');
const ROLLOUT = resolve(FIXTURES, 'rollout-token-count.jsonl');

async function payloadOf(overrides: Record<string, unknown>): Promise<Record<string, unknown>> {
  return { ...(await loadHarnessPayload('codex-cli', 'post-tool-use.json') as Record<string, unknown>), ...overrides };
}
async function handle(payload: Record<string, unknown>) {
  const ledger = new RecordingLedger();
  const errors = new RecordingErrors();
  const engine = createBrakeEngine({ descriptor: codexDescriptor, config: DEFAULT_CONFIG, ledger });
  const input = await mapCodexInput('PostToolUse', payload, errors);
  const decision = await engine.handle(mapCodexEvent('PostToolUse', payload) as RuntimeEvent, input);
  return { ledger, errors, input, decision };
}

describe('Codex CLI measured usage from the session rollout', () => {
  it('reports the rollout tokens and model window in the ledger tool line', async () => {
    const { ledger, errors, input } = await handle(await payloadOf({ transcript_path: ROLLOUT }));
    expect(input.measured).toEqual({ tokens: 78_260, contextWindow: 258_400, at: '2026-10-08T16:31:34.239Z' });
    expect(ledger.toolLine()).toMatchObject({ source: 'measured', usedTokens: 78_260, windowTokens: 258_400, windowOrigin: 'harness', zone: 'GREEN' });
    expect(errors.records).toEqual([]);
  });
});

describe('Codex CLI estimate fallback', () => {
  it.each([
    ['a subagent payload', { transcript_path: ROLLOUT, agent_id: 'agent-1' }],
    ['a null transcript path', { transcript_path: null }],
    ['a rollout without token_count info', { transcript_path: resolve(FIXTURES, 'rollout-no-token-count.jsonl') }],
  ])('keeps the estimate without logging for %s', async (_label, overrides) => {
    const { input, errors, ledger } = await handle(await payloadOf(overrides));
    expect(input.measured).toBeUndefined();
    expect(ledger.toolLine()).toMatchObject({ source: 'estimated', windowOrigin: 'config' });
    expect(errors.records).toEqual([]);
  });

  it('records a rollout I/O failure in the runtime error log and keeps the estimate', async () => {
    const { input, errors, decision } = await handle(await payloadOf({ transcript_path: FIXTURES }));
    expect(input.measured).toBeUndefined();
    expect(decision).toEqual({ kind: 'neutral' });
    expect(errors.records).toEqual([{ event: 'PostToolUse', code: 'UNEXPECTED', detail: 'TranscriptUnreadableError' }]);
  });
});
