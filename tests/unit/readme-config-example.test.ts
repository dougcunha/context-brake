import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { configurationSchema } from '../../src/core/contracts/configuration.js';

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
