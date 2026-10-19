import { describe, expect, it } from 'vitest';
import { formatEquivalentCommand } from '../../src/cli/assistant/equivalent-command.js';
import { renderSummary } from '../../src/cli/assistant/summary.js';
import type { AssistantFacts } from '../../src/cli/assistant/types.js';
import { createStyle } from '../../src/cli/output/style.js';

const FACTS: AssistantFacts = {
  selected: ['claude-code', 'codex-cli'], excluded: ['opencode'], snapshotCommand: 'sdd-snapshot', triggerZone: 'RED', triggerPercentage: null, resumeCommand: 'sdd-orchestrate-flow',
  invocations: [{ harness: 'claude-code', command: '/sdd-snapshot', resumeCommand: '/sdd-orchestrate-flow' }, { harness: 'codex-cli', command: '$sdd-snapshot', resumeCommand: '$sdd-orchestrate-flow' }],
  restartOn: true, restartLimit: 3, restartModes: [{ harness: 'claude-code', mode: 'automatic' }, { harness: 'codex-cli', mode: 'semi-automatic' }],
  statuslineBridge: true, contextSource: 'bridge', debug: false, gitIgnore: true,
};
const ESCAPE = String.fromCharCode(27);
const CHOICES_SUMMARY = [
  'Summary of your choices:',
  '',
  '┌─ Harnesses',
  '│  claude-code  enabled, restart: automatic',
  '│  codex-cli    enabled, restart: semi-automatic',
  '│  opencode     turned off',
  '└─',
  '',
  '┌─ Snapshot',
  '│  Command         sdd-snapshot',
  '│  Trigger zone    RED',
  '│  Resume          sdd-orchestrate-flow',
  '│  In claude-code  /sdd-snapshot, resume: /sdd-orchestrate-flow',
  '│  In codex-cli    $sdd-snapshot, resume: $sdd-orchestrate-flow',
  '└─',
  '',
  '┌─ Options',
  '│  Restart             on, at most 3 consecutive restarts',
  '│  Status line bridge  yes',
  '│  Debug mode          off',
  '│  Git ignore          yes',
  '└─',
  '',
  'Equivalent command: context-brake init --harness claude-code --auto-restart --max-restarts 3',
];
const NOT_APPLICABLE_OPTIONS = [
  '│  Restart             off',
  '│  Status line bridge  not applicable (Claude Code not selected)',
  '│  Debug mode          off',
  '│  Git ignore          not applicable (not a Git repository)',
];
const DECLINED_ROWS = [
  '│  none  no harness selected',
  '│  Command       sdd-snapshot',
  '│  Trigger zone  RED',
  '│  Resume        none',
  '│  Restart             on, at most the default number of consecutive restarts',
  '│  Status line bridge  no',
  '│  Debug mode          on',
  '│  Git ignore          no',
];
const TWO_LINE_COMMAND = [
  'Equivalent command:',
  "  POSIX shells: context-brake init --snapshot-command 'it'\\''s'",
  "  PowerShell: context-brake init --snapshot-command 'it''s'",
];
const COMMAND = formatEquivalentCommand(['--harness', 'claude-code', '--auto-restart', '--max-restarts', '3']);

describe('assistant summary (prd-16 FR-06, NFR-01, NFR-02, TC-13)', () => {
  it('groups the choices into cards with the restart mode of each harness and the command (FR-06, TC-13)', () => {
    expect(renderSummary(FACTS, COMMAND)).toEqual(CHOICES_SUMMARY);
  });
  it('states the no-command and not-applicable cases in words (NFR-01, TC-13)', () => {
    const facts = { ...FACTS, snapshotCommand: null, resumeCommand: null, restartOn: false, restartLimit: null, restartModes: [], statuslineBridge: null, gitIgnore: null, excluded: [] };
    const lines = renderSummary(facts, ['context-brake init']);
    expect(lines).toContain('│  Command  none (only zone headers are injected)');
    expect(lines.filter((line) => NOT_APPLICABLE_OPTIONS.includes(line))).toEqual(NOT_APPLICABLE_OPTIONS);
    expect(lines.at(-1)).toBe('Equivalent command: context-brake init');
  });
  it('states declined choices, no harness, and the default restart limit in words (FR-06, TC-13)', () => {
    const facts = { ...FACTS, selected: [], excluded: [], resumeCommand: null, invocations: [], restartLimit: null, restartModes: [], statuslineBridge: false, debug: true, gitIgnore: false };
    const lines = renderSummary(facts, ['context-brake init']);
    expect(lines.filter((line) => line.startsWith('│'))).toEqual(DECLINED_ROWS);
  });
  it('prints a two-line command under its own header with no escape sequences in the plain style (NFR-01, TC-13)', () => {
    const lines = renderSummary(FACTS, formatEquivalentCommand(['--snapshot-command', "it's"]));
    expect(lines.join('\n')).not.toContain(ESCAPE);
    expect(lines.slice(-3)).toEqual(TWO_LINE_COMMAND);
  });
});

describe('assistant summary styles (NFR-01, TC-13)', () => {
  it('keeps every word label when color is on, so color only reinforces the text', () => {
    const colored = renderSummary(FACTS, COMMAND, createStyle({ color: true, unicode: true }));
    expect(colored.join('\n')).toContain(ESCAPE);
    expect(colored.map((line) => line.replaceAll(new RegExp(`${ESCAPE}\\[[0-9;]*m`, 'g'), ''))).toEqual(renderSummary(FACTS, COMMAND));
  });
  it('draws the cards with ASCII characters when the terminal cannot show box drawing (NFR-01)', () => {
    const lines = renderSummary(FACTS, COMMAND, createStyle({ color: false, unicode: false }));
    expect(lines.slice(2, 4)).toEqual(['+- Harnesses', '|  claude-code  enabled, restart: automatic']);
  });
});

describe('assistant summary of the context source (DEC-09, TC-15)', () => {
  it('names the mod and says the status line is left alone', () => {
    const lines = renderSummary({ ...FACTS, statuslineBridge: null, contextSource: 'mod' }, ['context-brake init']);
    expect(lines).toContain('│  Context source  mod (your status line is left alone)');
    expect(lines.some((line) => line.includes('Status line bridge'))).toBe(false);
  });
});
