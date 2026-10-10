import { describe, expect, it } from 'vitest';
import { formatEquivalentCommand } from '../../src/cli/assistant/equivalent-command.js';
import { renderSummary } from '../../src/cli/assistant/summary.js';
import type { AssistantFacts } from '../../src/cli/assistant/types.js';

const FACTS: AssistantFacts = {
  selected: ['claude-code', 'codex-cli'], excluded: ['opencode'], snapshotCommand: '/sdd-snapshot', triggerZone: 'RED', resumeCommand: '/sdd-orchestrate-flow',
  restartOn: true, restartLimit: 3, restartModes: [{ harness: 'claude-code', mode: 'automatic' }, { harness: 'codex-cli', mode: 'semi-automatic' }],
  statuslineBridge: true, debug: false, gitIgnore: true,
};
const ESCAPE = String.fromCharCode(27);
const CHOICES_SUMMARY = [
  'Summary of your choices:',
  '  Harnesses: claude-code, codex-cli (turned off: opencode)',
  '  Snapshot command: /sdd-snapshot (trigger RED, resume /sdd-orchestrate-flow)',
  '  Restart: on, at most 3 consecutive restarts',
  '    claude-code: automatic',
  '    codex-cli: semi-automatic',
  '  Status line bridge: yes',
  '  Debug mode: off',
  '  Git ignore: yes',
  'Equivalent command: context-brake init --harness claude-code --auto-restart --max-restarts 3',
];
const NOT_APPLICABLE_SUMMARY = [
  'Summary of your choices:',
  '  Harnesses: claude-code, codex-cli',
  '  Snapshot command: none (only zone headers are injected)',
  '  Restart: off',
  '  Status line bridge: not applicable (Claude Code not selected)',
  '  Debug mode: off',
  '  Git ignore: not applicable (not a Git repository)',
  'Equivalent command: context-brake init',
];
const DECLINED_CHOICES = [
  '  Harnesses: none',
  '  Snapshot command: /sdd-snapshot (trigger RED)',
  '  Restart: on, at most the default number of consecutive restarts',
  '  Status line bridge: no',
  '  Debug mode: on',
  '  Git ignore: no',
];
const TWO_LINE_COMMAND = [
  'Equivalent command:',
  "  POSIX shells: context-brake init --snapshot-command 'it'\\''s'",
  "  PowerShell: context-brake init --snapshot-command 'it''s'",
];

describe('assistant summary (prd-16 FR-06, NFR-01, NFR-02, TC-13)', () => {
  it('lists the choices, the restart mode of each harness, and the command (FR-06, TC-13)', () => {
    const lines = renderSummary(FACTS, formatEquivalentCommand(['--harness', 'claude-code', '--auto-restart', '--max-restarts', '3']));
    expect(lines).toEqual(CHOICES_SUMMARY);
  });
  it('states the no-command and not-applicable cases in words (NFR-01, TC-13)', () => {
    const facts = { ...FACTS, snapshotCommand: null, resumeCommand: null, restartOn: false, restartLimit: null, restartModes: [], statuslineBridge: null, gitIgnore: null, excluded: [] };
    expect(renderSummary(facts, ['context-brake init'])).toEqual(NOT_APPLICABLE_SUMMARY);
  });
  it('states declined choices, no harness, and the default restart limit in words (FR-06, TC-13)', () => {
    const facts = { ...FACTS, selected: [], excluded: [], resumeCommand: null, restartLimit: null, restartModes: [], statuslineBridge: false, debug: true, gitIgnore: false };
    expect(renderSummary(facts, ['context-brake init']).slice(1, -1)).toEqual(DECLINED_CHOICES);
  });
  it('prints a two-line command under its own header with no color or escape sequences, so NO_COLOR is trivially respected (NFR-01, TC-13)', () => {
    const lines = renderSummary(FACTS, formatEquivalentCommand(['--snapshot-command', "it's"]));
    expect(lines.join('\n')).not.toContain(ESCAPE);
    expect(lines.slice(-3)).toEqual(TWO_LINE_COMMAND);
  });
});
