import { describe, expect, it } from 'vitest';
import type { ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import type { ToolCall } from '../../src/core/contracts/runtime.js';
import { createBrakeEngine } from '../../src/core/services/brake-engine.js';
import { CountingPresence, DELEGATED_DESCRIPTOR, DELEGATED_KEY, delegatedConfig, MemoryBlocks, MemoryLedger, sessionAtTurn, toolCall } from '../helpers/delegated-fixtures.js';

const DENY = '[ContextBrake v1] BLOCKED tool=Read zone=CRITICAL turn=12/12 usage=13% tokens=16800/128000 source=estimated reason=critical_ceiling. Allowed: read or write tasks/**/context-snapshot.md, skill sdd-snapshot, git status, git add, git commit. Run "/sdd-snapshot", then end reply with [REQUEST_SESSION_RESET].';
function critical(config: ContextBrakeConfig = delegatedConfig(), present = false) {
  const blocks = new MemoryBlocks();
  const engine = createBrakeEngine({ descriptor: DELEGATED_DESCRIPTOR, config, ledger: new MemoryLedger(sessionAtTurn(12)), blocks, readValidationCommand: async () => 'npm test', planPresence: new CountingPresence(present) });
  return { engine, blocks, check: (tool: ToolCall) => engine.handle({ kind: 'pre_tool', session: DELEGATED_KEY, tool }) };
}

describe('delegated allowlist at the ceiling (TC-04, FR-06)', () => {
  it.each<[string, ToolCall]>([
    ['a matching snapshot write', toolCall({ name: 'Write', category: 'file_write', paths: ['tasks/prd-06/context-snapshot.md'] })],
    ['a matching snapshot read', toolCall({ name: 'Read', category: 'file_read', paths: ['tasks/a/b/context-snapshot.md'] })],
    ['the snapshot skill derived from the command', toolCall({ name: 'Skill', category: 'skill', skill: 'sdd-snapshot' })],
    ['git commit', toolCall({ name: 'Bash', category: 'shell', command: 'git commit -m checkpoint' })],
  ])('allows %s', async (_, tool) => {
    const { check, blocks } = critical();
    expect(await check(tool)).toEqual({ kind: 'neutral' });
    expect(blocks.records).toEqual([]);
  });
  it('allows configured skills and additional commands', async () => {
    const config = { ...delegatedConfig({ allowedSkills: ['save-state'] }), brake: { additionalAllowedCommands: ['npm run lint'] } };
    const { check } = critical(config);
    expect(await check(toolCall({ name: 'Skill', category: 'skill', skill: 'save-state' }))).toEqual({ kind: 'neutral' });
    expect(await check(toolCall({ name: 'Bash', category: 'shell', command: 'npm run lint' }))).toEqual({ kind: 'neutral' });
  });
  it.each<[string, ToolCall]>([
    ['a write outside the patterns', toolCall({ name: 'Write', category: 'file_write', paths: ['src/app.ts'] })],
    ['the plan file', toolCall({ name: 'Write', category: 'file_write', paths: ['task_plan.json'] })],
    ['the plan validation command', toolCall({ name: 'Bash', category: 'shell', command: 'npm test' })],
    ['another skill', toolCall({ name: 'Skill', category: 'skill', skill: 'deploy' })],
    ['an unknown tool', toolCall({ name: 'WebFetch', category: 'other' })],
  ])('denies %s', async (_, tool) => {
    const { check, blocks } = critical();
    expect((await check(tool)).kind).toBe('deny');
    expect(blocks.records).toHaveLength(1);
  });
});

describe('delegated deny message (TC-04, FR-07)', () => {
  it('lists the allowed items and the snapshot command without plan files', async () => {
    const decision = await critical().check(toolCall({ name: 'Read', category: 'file_read', paths: ['src/app.ts'] }));
    expect(decision).toEqual({ kind: 'deny', tool: 'Read', reason: 'critical_ceiling', message: DENY });
    expect(DENY).not.toMatch(/task_plan|state_checkpoint|validation/);
  });
  it('falls back to the plan allowlist once the plan file exists', async () => {
    const { check } = critical(delegatedConfig(), true);
    expect(await check(toolCall({ name: 'Bash', category: 'shell', command: 'npm test' }))).toEqual({ kind: 'neutral' });
  });
});
