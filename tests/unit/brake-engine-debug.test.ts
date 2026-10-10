import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import { createBrakeEngine } from '../../src/core/services/brake-engine.js';
import { TELEMETRY_BLOCK_PREFIX } from '../../src/core/services/telemetry-block.js';
import { DELEGATED_DESCRIPTOR, DELEGATED_KEY, MemoryLedger, toolCall } from '../helpers/delegated-fixtures.js';

const READ = toolCall({ name: 'Read', category: 'file_read', paths: ['src/app.ts'] });
const LOW_USAGE = { measured: { tokens: 12800, contextWindow: 128000 } };
const DEBUG_LINE = ' debug_line="📊 ContextBrake: 10% · 12800/128000 (harness) · measured · GREEN" (end your reply with this line)';

async function postToolDecision(config: ContextBrakeConfig) {
  const engine = createBrakeEngine({
    descriptor: DELEGATED_DESCRIPTOR, config, ledger: new MemoryLedger([]),
  });
  return engine.handle({ kind: 'post_tool', session: DELEGATED_KEY, tool: READ, toolUseId: 'toolu_1' }, LOW_USAGE);
}
function blockOf(decision: { kind: string; block?: string }): string {
  return decision.kind === 'context' ? (decision.block ?? '') : '';
}

describe('telemetry injection in the debug mode (FR-06, DEC-07, TC-09, TC-10)', () => {
  it('injects the telemetry block at 10% GREEN with threshold_only when the debug mode is on', async () => {
    const block = blockOf(await postToolDecision({ ...DEFAULT_CONFIG, debug: true }));
    expect(block).toContain(`${TELEMETRY_BLOCK_PREFIX} turn=1 usage=10% tokens=12800/128000 source=measured window=harness zone=GREEN`);
    expect(block).toContain(DEBUG_LINE);
  });
});
