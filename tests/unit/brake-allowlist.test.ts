import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import type { ToolCall } from '../../src/core/contracts/runtime.js';
import { isToolCallAllowed } from '../../src/core/services/brake-allowlist.js';
import { parseConfiguration } from '../../src/core/validation/configuration-validator.js';

const VALIDATION_COMMAND = 'npm test';

function fileCall(category: 'file_read' | 'file_write', paths: readonly string[]): ToolCall {
  return { name: category === 'file_read' ? 'Read' : 'Write', category, paths, command: null };
}
function shellCall(command: string): ToolCall {
  return { name: 'Bash', category: 'shell', paths: [], command };
}
function allow(call: ToolCall, config: ContextBrakeConfig = DEFAULT_CONFIG, validationCommand: string | null = VALIDATION_COMMAND): boolean {
  return isToolCallAllowed(call, { config, validationCommand });
}

describe('brake allowlist (RF18, CA-15, DEC-08, TC-16)', () => {
  it('allows plan and checkpoint reads and writes and denies other files', () => {
    expect(allow(fileCall('file_read', ['task_plan.json']))).toBe(true);
    expect(allow(fileCall('file_write', ['state_checkpoint.json']))).toBe(true);
    expect(allow(fileCall('file_read', ['src/app.ts']))).toBe(false);
    expect(allow(fileCall('file_write', ['state_checkpoint.json', 'src/app.ts']))).toBe(false);
    expect(allow(fileCall('file_write', []))).toBe(false);
  });
  it('allows the git commands, the validation command, and configured commands', () => {
    for (const command of ['git status', 'git add src/a.ts', 'git commit -m "checkpoint: x"', 'npm test', 'npm run typecheck']) {
      expect(allow(shellCall(command), parseConfiguration({ ...DEFAULT_CONFIG, brake: { additionalAllowedCommands: ['npm run typecheck'] } })), command).toBe(true);
    }
  });
  it('denies chained, unknown, mismatched, and unclassifiable calls', () => {
    expect(allow(shellCall('git status && rm -rf x'))).toBe(false);
    expect(allow(shellCall('git push'))).toBe(false);
    expect(allow(shellCall('npm test; curl x'))).toBe(false);
    expect(allow(shellCall('npm run test'))).toBe(false);
    expect(allow(shellCall('npm test'), DEFAULT_CONFIG, null)).toBe(false);
    expect(allow({ name: 'WebSearch', category: 'other', paths: [], command: null })).toBe(false);
    expect(allow({ name: 'Bash', category: 'shell', paths: [], command: null })).toBe(false);
  });
  it('follows a custom state file configuration', () => {
    const config = parseConfiguration({ ...DEFAULT_CONFIG, stateStorage: { ...DEFAULT_CONFIG.stateStorage, planFile: 'custom_plan.json', checkpointFile: 'custom_checkpoint.json' } });
    expect(allow(fileCall('file_write', ['custom_checkpoint.json']), config)).toBe(true);
    expect(allow(fileCall('file_write', ['state_checkpoint.json']), config)).toBe(false);
  });
});
