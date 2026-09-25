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
