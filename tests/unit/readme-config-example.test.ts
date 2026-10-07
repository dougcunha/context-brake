import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { configurationSchema } from '../../src/core/contracts/configuration.js';

const readme = readFileSync(join(__dirname, '../../README.md'), 'utf8');
const telemetry = readFileSync(join(__dirname, '../../docs/telemetry-block.md'), 'utf8');

function readmeConfigExample(): unknown {
  const match = readme.match(/```json\n([\s\S]*?)\n```/);
  if (!match?.[1]) throw new Error('README config example not found');
  return JSON.parse(match[1]) as unknown;
}

describe('README configuration example (T09, RF17, CR-03, prd-12 TC-15)', () => {
  it('parses against the published configuration schema', () => {
    expect(configurationSchema.safeParse(readmeConfigExample()).success).toBe(true);
  });
});

describe('README and telemetry docs for the status line bridge (PRD 2.2 FR-09, DEC-12, TC-19, TC-18)', () => {
  it('documents the flag, its removal, and the local scope', () => {
    expect(readme).toContain('npx context-brake init --statusline-bridge');
    expect(readme).toContain('`context-brake init --no-statusline-bridge`');
    expect(readme).toContain('`statusLine` into `.claude/settings.local.json`, the local, unversioned settings file');
  });

  it('documents the footer effect, the 1M zones, and the non-interactive and Windows limits', () => {
    expect(readme).toContain('hides most footer keyboard hints');
    expect(readme).toContain('With a 1,000,000-token model, `RED` starts above 650,000 tokens');
    expect(readme).toContain('so `claude -p` sessions keep using `contextWindowCeiling`');
    expect(readme).toContain('set `CLAUDE_CODE_GIT_BASH_PATH` to the `bash.exe` of Git for Windows');
    expect(readme).toContain('`STATUSLINE_POWERSHELL_FALLBACK`');
  });

  it('documents the window origins, the default bridge, and the declared window (prd-09 FR-08, TC-14)', () => {
    expect(readme).toContain('the telemetry block shows `window=config`');
    expect(readme).toContain('`telemetry.declaredContextWindow` (`window=declared`)');
    expect(readme).toContain('`init` installs it by default');
    expect(telemetry).toContain('window=<harness|declared|config>');
  });

  it('documents the shell-neutral command and the fallback line (FR-01, FR-03, TC-18)', () => {
    expect(readme).toContain('with no pipe, subshell, or separator');
    expect(readme).toContain('`STATUSLINE_BRIDGE_OUTDATED`');
  });

  it('lists the statusline ledger line and the deadline fields in the telemetry specification', () => {
    expect(telemetry).toContain('{"v":1,"type":"statusline","at":"2026-09-25T12:00:00.000Z","windowTokens":1000000,"inputTokens":200000,"usedPercentage":20,"model":"claude-opus-5-5"}');
    expect(telemetry).toContain('event `StatusLine`');
    expect(telemetry).toContain('`phase`, the step that was running');
  });
});

describe('README for the single mode and the debug channel (prd-12 FR-04, FR-12, TC-15)', () => {
  it('documents the snapshot and resume commands with their init flags', () => {
    expect(readme).toContain('### Snapshot and Resume Commands');
    for (const flag of ['--snapshot-command <text>', '--resume-command <text>', '--snapshot-trigger <YELLOW|RED>', '--no-snapshot-command']) expect(readme).toContain(flag);
    expect(readme).toContain('run "<command>", then end reply with [REQUEST_SESSION_RESET]');
    expect(readme).toContain('[ContextBrake resume v1] Run "<resumeCommand>" before continuing.');
  });

  it('documents that no tool call is ever blocked, in the README and the telemetry specification', () => {
    expect(readme).toContain('It never blocks a tool call.');
    expect(telemetry).toContain('ContextBrake never denies a tool call');
    expect(`${readme}\n${telemetry}`).not.toMatch(/BLOCKED tool=|blocks\.jsonl|other tools are blocked/);
  });

  it('documents debug mode without the instruction files', () => {
    expect(readme).toContain('debug_line=');
    expect(readme).toContain('Nothing is written to instruction files.');
  });

  it('documents the hook deadlines', () => {
    expect(readme).toContain('Each hook call has an internal deadline of 1.5 seconds; the session start event gets 5 seconds');
  });

  it('documents the upgrade from the earlier modes and the downgrade', () => {
    expect(readme).toContain('**Upgrading an installation from before the single mode:**');
    expect(readme).toContain('**Downgrading:**');
  });
});
