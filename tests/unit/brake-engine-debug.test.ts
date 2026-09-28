import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import { createBrakeEngine } from '../../src/core/services/brake-engine.js';
import { TELEMETRY_BLOCK_PREFIX } from '../../src/core/services/telemetry-block.js';
import { CountingPresence, DELEGATED_DESCRIPTOR, DELEGATED_KEY, MemoryBlocks, MemoryLedger, toolCall } from '../helpers/delegated-fixtures.js';

const READ = toolCall({ name: 'Read', category: 'file_read', paths: ['src/app.ts'] });
const LOW_USAGE = { measured: { tokens: 12800, contextWindow: 128000 } };

async function postToolDecision(config: ContextBrakeConfig) {
  const engine = createBrakeEngine({
    descriptor: DELEGATED_DESCRIPTOR, config, ledger: new MemoryLedger([]), blocks: new MemoryBlocks(), planPresence: new CountingPresence(false),
    readValidationCommand: async () => null,
  });
  return engine.handle({ kind: 'post_tool', session: DELEGATED_KEY, tool: READ, toolUseId: 'toolu_1' }, LOW_USAGE);
}

describe('telemetry injection in the debug mode (TC-05, FR-03, DEC-04)', () => {
  it('injects the telemetry block at 10% GREEN with threshold_only when the debug mode is on', async () => {
    const decision = await postToolDecision({ ...DEFAULT_CONFIG, debug: true });
    expect(decision).toMatchObject({ kind: 'context' });
    expect(decision.kind === 'context' ? decision.block : '').toContain(`${TELEMETRY_BLOCK_PREFIX} turn=1 usage=10% tokens=12800/128000 source=measured zone=GREEN`);
  });
  it('stays neutral at 10% GREEN when the debug mode is off', async () => {
    expect(await postToolDecision({ ...DEFAULT_CONFIG, debug: false })).toEqual({ kind: 'neutral' });
  });
  it('ignores the debug mode in light mode', async () => {
    expect(await postToolDecision({ ...DEFAULT_CONFIG, debug: true, lightMode: { triggerZone: 'RED' } })).toEqual({ kind: 'neutral' });
  });
  it('leaves the stored injection mode unchanged', async () => {
    const config: ContextBrakeConfig = { ...DEFAULT_CONFIG, debug: true };
    await postToolDecision(config);
    expect(config.telemetry.injectionMode).toBe('threshold_only');
  });
});
