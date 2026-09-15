import { describe, expect, it } from 'vitest';
import { HARNESS_IDS, type HarnessId } from '../../src/core/contracts/harness.js';
import {
  ADAPTER_DESCRIPTORS,
  getAdapter,
  getAllAdapters,
  getDescriptor,
} from '../../src/infrastructure/harnesses/registry.js';

const EXPECTED_EVENTS: Readonly<Record<HarnessId, string>> = {
  'claude-code': 'PreToolUse',
  'codex-cli': 'PreToolUse',
  cursor: 'preToolUse',
  'github-copilot-cli': 'preToolUse',
  opencode: 'tool.execute.before',
  pi: 'tool_call',
  'oh-my-pi': 'tool_call',
  'antigravity-cli': 'PreInvocation',
};

describe('adapter descriptor registry (RF1, RF2, RF8)', () => {
  it('registers all eight harness descriptors immutably', () => {
    expect(ADAPTER_DESCRIPTORS).toHaveLength(8);
    const ids = ADAPTER_DESCRIPTORS.map((d) => d.id);
    for (const id of HARNESS_IDS) {
      expect(ids).toContain(id);
    }
  });

  it('constructs each adapter through getAdapter', () => {
    for (const id of HARNESS_IDS) {
      const adapter = getAdapter(id);
      expect(adapter.id).toBe(id);
      const fixture = adapter.benchmarkFixture();
      expect(fixture.harness).toBe(id);
      expect(fixture.event).toBe(EXPECTED_EVENTS[id]);
      expect(fixture.targetMilliseconds).toBe(adapter.executionModel === 'process' ? 100 : 15);
    }
  });

  it('returns all adapters via getAllAdapters', () => {
    const all = getAllAdapters();
    expect(all).toHaveLength(8);
  });

  it('throws on unknown harness descriptor lookup', () => {
    expect(() => getDescriptor('unknown-harness' as HarnessId)).toThrow('Unknown harness');
  });
});
