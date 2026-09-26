import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { configurationSchema, DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';

function readmeLightExample(): Record<string, unknown> {
  const content = readFileSync(join(__dirname, '../../README.md'), 'utf8');
  const block = [...content.matchAll(/```json\n([\s\S]*?)\n```/g)].map((match) => match[1] ?? '').find((json) => json.includes('"lightMode"'));
  if (block === undefined) throw new Error('README light mode example not found');
  return JSON.parse(block) as Record<string, unknown>;
}

describe('README light mode example (TC-14, FR-08)', () => {
  it('parses against the configuration schema when merged into the defaults', () => {
    expect(configurationSchema.safeParse({ ...DEFAULT_CONFIG, ...readmeLightExample() }).success).toBe(true);
  });
});
