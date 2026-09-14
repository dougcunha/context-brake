import { describe, expect, it } from 'vitest';
import { changePlanSchema, fileChangeSchema } from '../../src/core/contracts/changes.js';

describe('changes contracts schema validation', () => {
  it('validates a valid fileChange', () => {
    const change = {
      path: 'CLAUDE.md',
      realPath: '/repo/CLAUDE.md',
      kind: 'update' as const,
      owner: 'instruction_block' as const,
      beforeSha256: null,
      afterSha256: 'abc',
      preview: { summary: 'Add block' },
      content: 'hello',
    };
    expect(fileChangeSchema.parse(change)).toEqual(change);
  });

  it('validates a complete change plan', () => {
    const plan = {
      schemaVersion: 1 as const,
      projectRoot: '/repo',
      changes: [],
      conflicts: [],
      harnesses: [],
      requiresConfirmation: false,
    };
    expect(changePlanSchema.parse(plan)).toEqual(plan);
  });
});
