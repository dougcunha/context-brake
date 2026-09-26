import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { configurationSchema, DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';

function readmeConfigExample(): unknown {
  const content = readFileSync(join(__dirname, '../../README.md'), 'utf8');
  const match = content.match(/```json\n([\s\S]*?)\n```/);
  if (!match?.[1]) throw new Error('README config example not found');
  return JSON.parse(match[1]) as unknown;
}

describe('README configuration example (T09, RF17, CR-03)', () => {
  it('parses against the published configuration schema', () => {
    expect(configurationSchema.safeParse(readmeConfigExample()).success).toBe(true);
  });
});

function readmeDelegatedExample(): unknown {
  const content = readFileSync(join(__dirname, '../../README.md'), 'utf8');
  const block = [...content.matchAll(/```json\n([\s\S]*?)\n```/g)].map((match) => match[1] ?? '').find((json) => json.includes('"delegatedSnapshot"'));
  if (block === undefined) throw new Error('README delegated snapshot example not found');
  return JSON.parse(block) as unknown;
}

describe('README delegated snapshot example (TC-15, FR-09)', () => {
  it('parses against the configuration schema when merged into the defaults', () => {
    const example = readmeDelegatedExample() as Record<string, unknown>;
    expect(configurationSchema.safeParse({ ...DEFAULT_CONFIG, ...example }).success).toBe(true);
  });
});

describe('README and telemetry docs for the status line bridge (PRD 2.2 FR-09, DEC-12, TC-19)', () => {
  const readme = readFileSync(join(__dirname, '../../README.md'), 'utf8');
  const telemetry = readFileSync(join(__dirname, '../../docs/telemetry-block.md'), 'utf8');

  it('documents the flag, its removal, and the local scope', () => {
    expect(readme).toContain('npx context-brake init --statusline-bridge');
    expect(readme).toContain('`context-brake init --no-statusline-bridge`');
    expect(readme).toContain('`statusLine` into `.claude/settings.local.json`, the local, unversioned settings file');
  });

  it('documents the footer effect, the 1M zones, and the non-interactive and Windows limits', () => {
    expect(readme).toContain('hides most footer keyboard hints');
    expect(readme).toContain('With a 1,000,000-token model, `RED` starts above 650,000 tokens');
    expect(readme).toContain('so `claude -p`, including the sessions of `context-brake run`, keep using `contextWindowCeiling`');
    expect(readme).toContain('Windows without Git Bash (PowerShell only) is not verified');
  });

  it('lists the statusline ledger line in the telemetry specification', () => {
    expect(telemetry).toContain('{"v":1,"type":"statusline","at":"2026-09-25T12:00:00.000Z","windowTokens":1000000,"inputTokens":200000,"usedPercentage":20,"model":"claude-opus-5-5"}');
    expect(telemetry).toContain('event `StatusLine`');
  });
});
