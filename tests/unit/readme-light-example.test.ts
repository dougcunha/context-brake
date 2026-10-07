import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { configurationSchema, DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';

function readmeSnapshotExample(): Record<string, unknown> {
  const content = readFileSync(join(__dirname, '../../README.md'), 'utf8');
  const block = [...content.matchAll(/```json\n([\s\S]*?)\n```/g)].map((match) => match[1] ?? '').find((json) => json.includes('"resumeCommand"'));
  if (block === undefined) throw new Error('README snapshot example not found');
  return JSON.parse(block) as Record<string, unknown>;
}

describe('README snapshot example (prd-12 FR-04, FR-12, TC-15)', () => {
  it('parses against the configuration schema when merged into the defaults', () => {
    expect(configurationSchema.safeParse({ ...DEFAULT_CONFIG, ...readmeSnapshotExample() }).success).toBe(true);
  });
  it('names both commands', () => {
    expect(readmeSnapshotExample()).toEqual({ snapshot: { triggerZone: 'RED', command: '/sdd-snapshot', resumeCommand: '/sdd-orchestrate-flow' } });
  });
});
