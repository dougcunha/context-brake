import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import type { RuntimeDescriptor } from '../../src/core/contracts/runtime.js';
import type { LedgerLine } from '../../src/core/contracts/session-ledger.js';
import { createBrakeEngine } from '../../src/core/services/brake-engine.js';
import { CountingPresence, DELEGATED_DESCRIPTOR, DELEGATED_KEY, MemoryBlocks, MemoryLedger, toolCall } from '../helpers/delegated-fixtures.js';

const BASH = toolCall({ name: 'Bash', category: 'shell', command: 'npm test' });
const EDIT = toolCall({ name: 'Edit', category: 'file_write', paths: ['src/app.ts'] });
const INCIDENT = { measured: { tokens: 98000, contextWindow: null } };
const BRIDGE_128K: LedgerLine = { v: 1, type: 'statusline', at: '2026-09-28T17:00:00.000Z', windowTokens: 128000, inputTokens: null, usedPercentage: null, model: 'claude-opus-5-5' };
const CODEX: RuntimeDescriptor = { ...DELEGATED_DESCRIPTOR, harness: 'codex-cli', capabilities: [...DELEGATED_DESCRIPTOR.capabilities, { id: 'context_usage', state: 'unsupported' }] };

function engineWith(input: { readonly lines?: LedgerLine[]; readonly descriptor?: RuntimeDescriptor; readonly config?: ContextBrakeConfig }) {
  const blocks = new MemoryBlocks();
  const engine = createBrakeEngine({
    descriptor: input.descriptor ?? DELEGATED_DESCRIPTOR, config: input.config ?? DEFAULT_CONFIG, ledger: new MemoryLedger(input.lines ?? []), blocks,
    planPresence: new CountingPresence(false), readValidationCommand: async () => null,
  });
  return { engine, blocks };
}

describe('critical_ceiling only with a trusted window (prd-09 FR-02, DEC-03, TC-02)', () => {
  it.each([BASH, EDIT])('replays the incident: $name at CRITICAL over the 128000 fallback stays neutral and logs no block', async (tool) => {
    const { engine, blocks } = engineWith({});
    expect(await engine.handle({ kind: 'pre_tool', session: DELEGATED_KEY, tool }, INCIDENT)).toEqual({ kind: 'neutral' });
    expect(blocks.records).toEqual([]);
  });
  it.each([BASH, EDIT])('denies $name with critical_ceiling when the bridge recorded a 128000 window', async (tool) => {
    const { engine } = engineWith({ lines: [BRIDGE_128K] });
    expect(await engine.handle({ kind: 'pre_tool', session: DELEGATED_KEY, tool }, INCIDENT)).toMatchObject({ kind: 'deny', reason: 'critical_ceiling' });
  });
});

describe('critical_ceiling with a declared window (prd-09 FR-05, DEC-02, TC-02)', () => {
  const declared: ContextBrakeConfig = { ...DEFAULT_CONFIG, telemetry: { ...DEFAULT_CONFIG.telemetry, declaredContextWindow: 128000 } };
  it('denies on a harness without a window source when the window is declared', async () => {
    const { engine } = engineWith({ descriptor: CODEX, config: declared });
    expect(await engine.handle({ kind: 'pre_tool', session: DELEGATED_KEY, tool: BASH }, INCIDENT)).toMatchObject({ kind: 'deny', reason: 'critical_ceiling' });
  });
  it('ignores the declared window on Claude Code, whose window comes from the bridge', async () => {
    const { engine } = engineWith({ config: declared });
    expect(await engine.handle({ kind: 'pre_tool', session: DELEGATED_KEY, tool: BASH }, INCIDENT)).toEqual({ kind: 'neutral' });
  });
});
