import { describe, expect, it } from 'vitest';
import { HARNESS_IDS, type HarnessId } from '../../src/core/contracts/harness.js';
import {
  getAdapter,
  getAllAdapters,
  getDescriptor,
} from '../../src/infrastructure/harnesses/registry.js';

const EXPECTED_EVENTS: Readonly<Record<HarnessId, string>> = {
  'claude-code': 'PostToolUse',
  'codex-cli': 'PostToolUse',
  cursor: 'postToolUse',
  'github-copilot-cli': 'postToolUse',
  opencode: 'tool.execute.after',
  pi: 'tool_result',
  'oh-my-pi': 'tool_result',
  'antigravity-cli': 'PreInvocation',
};

describe('adapter descriptor registry (RF1, RF2, RF8)', () => {
  it('registers the eight harnesses in descriptor order', () => {
    const ids = getAllAdapters().map((adapter) => adapter.id);
    expect(ids).toEqual(['claude-code', 'codex-cli', 'cursor', 'github-copilot-cli', 'antigravity-cli', 'opencode', 'pi', 'oh-my-pi']);
  });

  it('builds each adapter with its benchmark event and overhead target', () => {
    for (const id of HARNESS_IDS) {
      const adapter = getAdapter(id);
      expect(adapter.id).toBe(id);
      const fixture = adapter.benchmarkFixture();
      expect(fixture.harness).toBe(id);
      expect(fixture.event).toBe(EXPECTED_EVENTS[id]);
      expect(fixture.targetMilliseconds).toBe(adapter.executionModel === 'process' ? 100 : 15);
    }
  });

  it('throws on unknown harness descriptor lookup', () => {
    expect(() => getDescriptor('unknown-harness' as HarnessId)).toThrow('Unknown harness');
  });
});
