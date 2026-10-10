import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import { runScripted } from '../helpers/assistant-context.js';

const CONFIGURED: Partial<ContextBrakeConfig> = {
  activeHarnesses: ['claude-code'],
  snapshot: { triggerZone: 'YELLOW', command: '/snap', resumeCommand: '/resume' },
  autoRestart: { maxConsecutiveRestarts: 4 },
  debug: true,
};

function lastBracket(question: string): string | undefined {
  return /\[([^\]]+)\][^[]*$/.exec(question)?.[1];
}

describe('assistant questions: defaults from the current configuration (prd-16 FR-03, US-02, TC-06)', () => {
  it('emits nothing when every answer keeps the current value (FR-03, TC-06)', async () => {
    const { result } = await runScripted(['', '', '', '', '', '', '', ''], { config: CONFIGURED });
    expect(result?.flags).toEqual(['--harness', 'claude-code']);
    expect(result?.facts).toMatchObject({ snapshotCommand: '/snap', triggerZone: 'YELLOW', restartOn: true, restartLimit: 4, debug: true });
  });
  it('clears the snapshot command and skips its trigger and resume questions (FR-02, TC-06)', async () => {
    const { result, asked } = await runScripted(['', 'none', 'n', '', ''], { config: CONFIGURED });
    expect(result?.flags).toEqual(['--harness', 'claude-code', '--no-snapshot-command', '--no-auto-restart']);
    expect(asked.some((question) => question.startsWith('Snapshot trigger'))).toBe(false);
  });
  it('changes the limit while restart stays on and turns debug off (FR-09, TC-06)', async () => {
    const { result } = await runScripted(['', '', '', '', 'y', '7', '', 'n'], { config: CONFIGURED });
    expect(result?.flags).toEqual(['--harness', 'claude-code', '--max-restarts', '7', '--no-debug']);
  });
  it('uses the flag defaults on a first run without a configuration (FR-03, DEC-03, TC-06)', async () => {
    const { asked, result } = await runScripted(['', '/s', 'YELLOW', '', '', '', 'y'], { config: null });
    expect(asked.slice(2).map(lastBracket)).toEqual(['RED', 'none', 'y/N', 'Y/n', 'y/N']);
    expect(result?.flags).toEqual(['--harness', 'claude-code', '--snapshot-command', '/s', '--snapshot-trigger', 'YELLOW', '--debug']);
  });
  it('honors a previous status line opt-out in the bridge default (FR-03, TC-06)', async () => {
    const { asked, result } = await runScripted(['', '', 'n', 'y', ''], { config: { ...DEFAULT_CONFIG }, optOut: true });
    expect(asked.find((question) => question.startsWith('Install the Claude Code'))).toContain('[y/N]');
    expect(result?.flags).toContain('--statusline-bridge');
  });
});
