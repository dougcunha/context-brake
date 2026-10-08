import { describe, expect, it } from 'vitest';
import { runScripted } from '../helpers/assistant-context.js';

const BOTH = { detected: ['claude-code', 'codex-cli'] } as const;

describe('assistant questions: order, defaults, and facts (prd-16 FR-02, FR-03, TC-06)', () => {
  it('asks every applicable question in order and builds the flags (FR-02, TC-06)', async () => {
    const { result, asked } = await runScripted(['', '/sdd-snapshot', '', '/sdd-orchestrate-flow', 'y', '3', '', ''], BOTH);
    const titles = asked.map((question) => question.split(/[\n:?[(]/)[0]);
    expect(titles).toEqual(['Harnesses to configure', 'Snapshot command ', 'Snapshot trigger YELLOW or RED ', 'Resume command ', 'Restart behavior of the selected harnesses', 'Consecutive-restart limit 1-10 ', 'Install the Claude Code status line bridge', 'Print context usage to the agent ']);
    expect(result?.flags).toEqual(['--harness', 'claude-code', '--harness', 'codex-cli', '--snapshot-command', '/sdd-snapshot', '--resume-command', '/sdd-orchestrate-flow', '--auto-restart', '--max-restarts', '3']);
  });
  it('lists detected harnesses with support level and the restart mode of each selected one (FR-03, TC-06)', async () => {
    const { asked } = await runScripted(['', '', 'n', '', ''], BOTH);
    expect(asked[0]).toContain('claude-code (detected, full support)');
    expect(asked[0]).toContain('[x]');
    expect(asked[2]).toMatch(/claude-code: automatic/);
    expect(asked[2]).toMatch(/codex-cli: semi-automatic/);
  });
  it('states the handoff carrier when restart is offered without a snapshot command (FR-03, TC-06)', async () => {
    const { asked } = await runScripted(['', 'none', 'n', 'n'], { detected: ['claude-code'] });
    expect(asked[2]).toContain('markdown handoff');
    const withCommand = await runScripted(['', '/s', '', '', 'n', 'n', 'n']);
    expect(withCommand.asked[4]).toContain('snapshot command');
  });
});

describe('assistant questions: applicability and exclusion (prd-16 FR-02, FR-05, TC-06)', () => {
  it('skips the restart and bridge questions when no selected harness applies (FR-02, TC-06)', async () => {
    const { result, asked } = await runScripted(['', '', ''], { detected: ['opencode'] });
    expect(asked).toHaveLength(3);
    expect(asked.some((question) => question.includes('Restart sessions'))).toBe(false);
    expect(result?.flags).toEqual(['--harness', 'opencode']);
  });
  it('turns a deselected detected harness into --exclude-harness (FR-05, TC-06)', async () => {
    const { result } = await runScripted(['1', '', 'n', '', ''], { detected: ['claude-code', 'codex-cli', 'opencode'] });
    expect(result?.flags).toEqual(['--harness', 'claude-code', '--exclude-harness', 'codex-cli', '--exclude-harness', 'opencode']);
    expect(result?.facts.excluded).toEqual(['codex-cli', 'opencode']);
  });
});
