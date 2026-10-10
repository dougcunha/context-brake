import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { RuntimeEvent } from '../../src/core/contracts/runtime.js';
import { createBrakeEngine } from '../../src/core/services/brake-engine.js';
import { claudeDescriptor, mapClaudeEvent, mapClaudeInput } from '../../src/infrastructure/harnesses/claude-code/runtime.js';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { RecordingErrors, RecordingLedger } from '../helpers/recording-ledger.js';

const FIXTURES = resolve('tests/fixtures/harnesses/claude-code');
const MAIN_TRANSCRIPT = resolve(FIXTURES, 'transcript-main.jsonl');

async function payloadOf(overrides: Record<string, unknown>): Promise<Record<string, unknown>> {
  return { ...(await loadHarnessPayload('claude-code', 'post-tool-use.json') as Record<string, unknown>), ...overrides };
}
async function handle(payload: Record<string, unknown>) {
  const ledger = new RecordingLedger();
  const errors = new RecordingErrors();
  const engine = createBrakeEngine({ descriptor: claudeDescriptor, config: DEFAULT_CONFIG, ledger });
  const input = await mapClaudeInput('PostToolUse', payload, errors);
  const decision = await engine.handle(mapClaudeEvent('PostToolUse', payload) as RuntimeEvent, input);
  return { ledger, errors, input, decision };
}

describe('Claude Code measured usage from the transcript (FR-04, FR-05, DEC-08, DEC-11, TC-17)', () => {
  it('reports the measured transcript usage in the post-tool block and the ledger tool line', async () => {
    const { ledger, errors, decision } = await handle(await payloadOf({ transcript_path: MAIN_TRANSCRIPT }));
    expect(decision.kind).toBe('context');
    expect(decision.kind === 'context' ? decision.block : '').toContain('tokens=194431/128000 source=measured');
    expect(ledger.toolLine()).toMatchObject({ source: 'measured', usedTokens: 194_431, windowTokens: 128_000 });
    expect(errors.records).toEqual([]);
  });
});

describe('Claude Code estimate fallback (FR-05, DEC-08, NFR-02, TC-17)', () => {
  it('keeps the estimate for a subagent payload even with a transcript path (DEC-08)', async () => {
    const { input, ledger } = await handle(await payloadOf({ transcript_path: MAIN_TRANSCRIPT, agent_id: 'agent-1' }));
    expect(input.measured).toBeUndefined();
    expect(ledger.toolLine()).toMatchObject({ source: 'estimated' });
  });

  it('keeps the estimate without logging when the transcript is missing (FR-05)', async () => {
    const { input, errors, ledger } = await handle(await payloadOf({}));
    expect(input.measured).toBeUndefined();
    expect(ledger.toolLine()).toMatchObject({ source: 'estimated' });
    expect(errors.records).toEqual([]);
  });

  it('records a transcript I/O failure in the runtime error log and keeps the estimate (NFR-02, NFR-03)', async () => {
    const { input, errors, decision } = await handle(await payloadOf({ transcript_path: FIXTURES }));
    expect(input.measured).toBeUndefined();
    expect(decision).toEqual({ kind: 'neutral' });
    expect(errors.records).toEqual([{ event: 'PostToolUse', code: 'UNEXPECTED', detail: 'TranscriptUnreadableError' }]);
  });

  it('reads no transcript for lifecycle events', async () => {
    expect(await mapClaudeInput('SessionStart', { session_id: 's', transcript_path: MAIN_TRANSCRIPT }, new RecordingErrors())).toEqual({});
  });
});
