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

describe('assistant summary (prd-16 FR-06, NFR-01, NFR-02, TC-13)', () => {
  it('lists the choices, the restart mode of each harness, and the command (FR-06, TC-13)', () => {
    const lines = renderSummary(FACTS, formatEquivalentCommand(['--harness', 'claude-code', '--auto-restart', '--max-restarts', '3']));
    expect(lines).toContain('  Harnesses: claude-code, codex-cli (turned off: opencode)');
    expect(lines).toContain('  Snapshot command: /sdd-snapshot (trigger RED, resume /sdd-orchestrate-flow)');
    expect(lines).toContain('  Restart: on, at most 3 consecutive restarts');
    expect(lines).toContain('    codex-cli: semi-automatic');
    expect(lines).toContain('  Git ignore: yes');
    expect(lines.at(-1)).toBe('Equivalent command: context-brake init --harness claude-code --auto-restart --max-restarts 3');
  });
  it('states the no-command and not-applicable cases in words (NFR-01, TC-13)', () => {
    const lines = renderSummary({ ...FACTS, snapshotCommand: null, resumeCommand: null, restartOn: false, restartLimit: null, statuslineBridge: null, gitIgnore: null, excluded: [] }, ['context-brake init']);
    expect(lines).toContain('  Snapshot command: none (only zone headers are injected)');
    expect(lines).toContain('  Restart: off');
    expect(lines).toContain('  Git ignore: not applicable (not a Git repository)');
    expect(lines).toContain('  Status line bridge: not applicable (Claude Code not selected)');
  });
  it('carries no color or escape sequences, so NO_COLOR is trivially respected (NFR-01, TC-13)', () => {
    const lines = renderSummary(FACTS, formatEquivalentCommand(['--snapshot-command', "it's"]));
    expect(lines.join('\n')).not.toContain(ESCAPE);
    expect(lines.at(-2)).toBe('  POSIX shells: context-brake init --snapshot-command \'it\'\\\'\'s\'');
  });
});
