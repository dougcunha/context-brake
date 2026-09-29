import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { configurationSchema, DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';

const readme = readFileSync(join(__dirname, '../../README.md'), 'utf8');
const telemetry = readFileSync(join(__dirname, '../../docs/telemetry-block.md'), 'utf8');

function readmeConfigExample(): unknown {
  const match = readme.match(/```json\n([\s\S]*?)\n```/);
  if (!match?.[1]) throw new Error('README config example not found');
  return JSON.parse(match[1]) as unknown;
}

describe('README configuration example (T09, RF17, CR-03)', () => {
  it('parses against the published configuration schema', () => {
    expect(configurationSchema.safeParse(readmeConfigExample()).success).toBe(true);
  });
});

function readmeDelegatedExample(): unknown {
  const block = [...readme.matchAll(/```json\n([\s\S]*?)\n```/g)].map((match) => match[1] ?? '').find((json) => json.includes('"delegatedSnapshot"'));
  if (block === undefined) throw new Error('README delegated snapshot example not found');
  return JSON.parse(block) as unknown;
}

describe('README delegated snapshot example (TC-15, FR-09)', () => {
  it('parses against the configuration schema when merged into the defaults', () => {
    const example = readmeDelegatedExample() as Record<string, unknown>;
    expect(configurationSchema.safeParse({ ...DEFAULT_CONFIG, ...example }).success).toBe(true);
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
    expect(readme).toContain('so `claude -p`, including the sessions of `context-brake run`, keep using `contextWindowCeiling`');
    expect(readme).toContain('set `CLAUDE_CODE_GIT_BASH_PATH` to the `bash.exe` of Git for Windows');
    expect(readme).toContain('`STATUSLINE_POWERSHELL_FALLBACK`');
  });

  it('documents the window origin rule, the default bridge, and the declared window (prd-09 FR-08, TC-14)', () => {
    expect(readme).toContain('A window taken from `contextWindowCeiling` never blocks a tool call');
    expect(readme).toContain('`telemetry.declaredContextWindow` (`window=declared`)');
    expect(readme).toContain('`init` installs it by default in full **and** light mode');
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

describe('README for the mode defaults and the debug channel (FR-06, FR-07, FR-08, FR-10, TC-18)', () => {
  it('documents light mode as the default and how to keep full mode', () => {
    expect(readme).toContain('Light Mode (telemetry only, the default)');
    expect(readme).toContain('npx context-brake init --no-light # full mode, recorded in the configuration');
    expect(readme).toContain('`LIGHT_MODE_DEFAULT_PENDING`');
    expect(readme).toContain('`LIGHT_MODE_DEFAULT_APPLIED`');
  });

  it('documents debug mode in both modes and nowhere in the instruction files', () => {
    expect(readme).not.toContain('Not in light mode');
    expect(readme).toContain('debug_line=');
    expect(readme).toContain('Nothing is written to instruction files any more');
  });

  it('names the protocol file as the other place that documents the debug line', () => {
    expect(readme).toContain('the same instruction also appears in the protocol file');
  });

  it('documents the hook deadlines', () => {
    expect(readme).toContain('Each hook call has an internal deadline of 1.5 seconds; the session start event gets 5 seconds');
  });

  it('documents the upgrade to the light default and the downgrade fields', () => {
    expect(readme).toContain('**Upgrading to the light default:**');
    expect(readme).toContain('**Downgrading:**');
    expect(readme).toContain('`"fullMode": true` in the configuration');
  });
});
