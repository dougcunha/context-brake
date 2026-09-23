import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import { renderProtocol } from '../../src/core/services/protocol-service.js';

function extractRow(text: string, zone: string): string {
  const line = text.split('\n').find((l) => l.startsWith(`| \`${zone}\``));
  return line ?? '';
}

function makeConfig(instructCheckpointCommit: boolean): ContextBrakeConfig {
  return {
    ...DEFAULT_CONFIG,
    stateStorage: { ...DEFAULT_CONFIG.stateStorage, instructCheckpointCommit },
  };
}

describe('protocol commit switch enabled (RF17, RF18, CA-14, TC-14)', () => {
  it('instructs checkpoint commit in the RED zone under default config', () => {
    const text = renderProtocol(DEFAULT_CONFIG);
    const redRow = extractRow(text, 'RED');
    expect(redRow).toContain('Update `task_plan.json` and `state_checkpoint.json`.');
    expect(redRow).toContain('If validation passes, commit with `checkpoint: <step title>`.');
    expect(redRow).toContain('End the response with `[REQUEST_SESSION_RESET]`.');
  });

  it('keeps git commands allowed in CRITICAL row when commit switch is on', () => {
    const text = renderProtocol(makeConfig(true));
    const criticalRow = extractRow(text, 'CRITICAL');
    expect(criticalRow).toContain('`git status`, `git add`, and `git commit` are allowed');
  });
});

describe('protocol commit switch disabled (RF17, RF18, CA-14, TC-14)', () => {
  it('omits commit instruction from RED row while keeping state file update', () => {
    const text = renderProtocol(makeConfig(false));
    const redRow = extractRow(text, 'RED');
    expect(redRow).toContain('Stop editing. Update `task_plan.json` and `state_checkpoint.json`.');
    expect(redRow).toContain('End the response with `[REQUEST_SESSION_RESET]`.');
    expect(redRow).not.toContain('commit with');
    expect(redRow).not.toContain('checkpoint:');
  });

  it('preserves CRITICAL row allowances and leaves other rows untouched', () => {
    const text = renderProtocol(makeConfig(false));
    const criticalRow = extractRow(text, 'CRITICAL');
    expect(criticalRow).toContain('`git status`, `git add`, and `git commit` are allowed');
    expect(extractRow(text, 'GREEN')).toBe(extractRow(renderProtocol(DEFAULT_CONFIG), 'GREEN'));
    expect(extractRow(text, 'YELLOW')).toBe(extractRow(renderProtocol(DEFAULT_CONFIG), 'YELLOW'));
  });

  it('renders identically on repeated calls', () => {
    const config = makeConfig(false);
    expect(renderProtocol(config)).toBe(renderProtocol(config));
  });
});
