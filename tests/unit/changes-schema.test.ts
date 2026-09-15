import { describe, expect, it } from 'vitest';
import { CHANGE_OWNERS, changePlanSchema, fileChangeSchema, harnessInstallPlanSchema } from '../../src/core/contracts/changes.js';

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
    const plan = { schemaVersion: 1 as const, projectRoot: '/repo', changes: [], conflicts: [], harnesses: [], requiresConfirmation: false };
    expect(changePlanSchema.parse(plan)).toEqual(plan);
  });
});

describe('changes contract owner closed set (RF24, DEC-02)', () => {
  it('accepts every closed owner including ignore_block', () => {
    expect(CHANGE_OWNERS).toContain('ignore_block');
    for (const owner of CHANGE_OWNERS) {
      const change = { path: '.gitignore', realPath: '/repo/.gitignore', kind: 'update' as const, owner, beforeSha256: null, afterSha256: null, preview: { summary: 'x' } };
      expect(fileChangeSchema.parse(change).owner).toBe(owner);
    }
  });

  it('rejects an unknown owner', () => {
    const change = { path: '.gitignore', realPath: '/repo/.gitignore', kind: 'update' as const, owner: 'unknown_owner', beforeSha256: null, afterSha256: null, preview: { summary: 'x' } };
    expect(fileChangeSchema.safeParse(change).success).toBe(false);
  });
});

describe('harness install plan contract (DEC-02, DEC-03)', () => {
  it('requires limitations alongside the derived support level', () => {
    const plan = { harness: 'codex-cli' as const, outcome: 'planned' as const, supportLevel: 'partial' as const, limitations: [{ capability: 'tool_coverage' as const, impact: 'Hosted tools such as web search bypass Codex CLI hooks.' }] };
    expect(harnessInstallPlanSchema.parse(plan)).toEqual(plan);
    expect(harnessInstallPlanSchema.safeParse({ harness: 'codex-cli', outcome: 'planned', supportLevel: 'partial' }).success).toBe(false);
  });
});
