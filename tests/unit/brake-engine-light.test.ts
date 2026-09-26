import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import type { ToolCall } from '../../src/core/contracts/runtime.js';
import type { LedgerLine } from '../../src/core/contracts/session-ledger.js';
import { createBrakeEngine } from '../../src/core/services/brake-engine.js';
import { CountingPresence, DELEGATED_DESCRIPTOR, DELEGATED_KEY, MemoryBlocks, MemoryLedger, SNAPSHOT_SECTION, sessionAtTurn, toolCall } from '../helpers/delegated-fixtures.js';

const LIGHT_CONFIG: ContextBrakeConfig = { ...DEFAULT_CONFIG, lightMode: { triggerZone: 'RED' }, delegatedSnapshot: { ...SNAPSHOT_SECTION, resumeCommand: '/sdd-orchestrate-flow' } };

class TrackingLedger extends MemoryLedger {
  reads = 0;
  resets = 0;
  override async readLines(): Promise<readonly LedgerLine[]> { this.reads += 1; return super.readLines(); }
  override async appendResetLine(): Promise<void> { this.resets += 1; }
}
function lightEngine(lines: LedgerLine[] = sessionAtTurn(12)) {
  const ports = { ledger: new TrackingLedger(lines), blocks: new MemoryBlocks(), presence: new CountingPresence(true), validationReads: 0, bootReads: 0 };
  const engine = createBrakeEngine({
    descriptor: DELEGATED_DESCRIPTOR, config: LIGHT_CONFIG, ledger: ports.ledger, blocks: ports.blocks, planPresence: ports.presence,
    readValidationCommand: async () => { ports.validationReads += 1; return 'npm test'; },
    readBoot: async () => { ports.bootReads += 1; return { kind: 'boot', text: 'boot' }; },
  });
  return { engine, ports };
}

describe('light mode never denies (TC-04, FR-06, DEC-05)', () => {
  it.each<[string, ToolCall]>([
    ['a file read', toolCall({ name: 'Read', category: 'file_read', paths: ['src/app.ts'] })],
    ['a file write', toolCall({ name: 'Write', category: 'file_write', paths: ['src/app.ts'] })],
    ['a shell command', toolCall({ name: 'Bash', category: 'shell', command: 'npm run build' })],
    ['a skill', toolCall({ name: 'Skill', category: 'skill', skill: 'deploy' })],
    ['an unknown tool', toolCall({ name: 'WebFetch', category: 'other' })],
  ])('keeps %s neutral in CRITICAL without reading the ledger', async (_, tool) => {
    const { engine, ports } = lightEngine();
    expect(await engine.handle({ kind: 'pre_tool', session: DELEGATED_KEY, tool })).toEqual({ kind: 'neutral' });
    expect(ports.blocks.records).toEqual([]);
    expect(ports.ledger.reads).toBe(0);
  });
});

describe('light mode injects nothing at session start (TC-04, FR-07, DEC-06)', () => {
  it.each(['new', 'clear', 'compact'] as const)('stays neutral on %s and still records the reset', async (reason) => {
    const { engine, ports } = lightEngine();
    expect(await engine.handle({ kind: 'session_reset', session: DELEGATED_KEY, reason })).toEqual({ kind: 'neutral' });
    expect(ports.ledger.resets).toBe(1);
    expect(ports.bootReads).toBe(0);
  });
});

describe('light mode reads no plan, validation, or boot state (TC-04, FR-02, NFR-02)', () => {
  it('injects the light action after a tool call without touching the ports', async () => {
    const { engine, ports } = lightEngine();
    const decision = await engine.handle({ kind: 'post_tool', session: DELEGATED_KEY, tool: toolCall({ name: 'Read', category: 'file_read' }), toolUseId: 'toolu_new' }, { observedCharacters: 1 });
    expect(decision).toMatchObject({ kind: 'context' });
    expect(decision.kind === 'context' && decision.block.endsWith('zone=CRITICAL action=save your snapshot or checkpoint immediately, then end reply with [REQUEST_SESSION_RESET]')).toBe(true);
    await engine.handle({ kind: 'pre_invocation', session: DELEGATED_KEY });
    await engine.handle({ kind: 'pre_tool', session: DELEGATED_KEY, tool: toolCall({ name: 'Read', category: 'file_read' }) });
    await engine.handle({ kind: 'session_reset', session: DELEGATED_KEY, reason: 'clear' });
    expect([ports.presence.calls, ports.validationReads, ports.bootReads]).toEqual([0, 0, 0]);
  });
});
