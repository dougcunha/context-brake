import { describe, expect, it } from 'vitest';
import { fileChangeSchema } from '../../src/core/contracts/changes.js';

describe('changes contract owner closed set (RF24, DEC-02)', () => {
  it.each(['protocol', 'instruction_block', 'ignore_block'])('rejects the removed %s owner (prd-12 FR-08, DEC-11)', (owner) => {
    const change = { path: 'x', realPath: '/repo/x', kind: 'update' as const, owner, beforeSha256: null, afterSha256: null, preview: { summary: 'x' } };
    expect(fileChangeSchema.safeParse(change).success).toBe(false);
  });
});
