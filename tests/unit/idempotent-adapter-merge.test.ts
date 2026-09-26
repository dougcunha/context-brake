import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { planClaudeInstall } from '../../src/infrastructure/harnesses/claude-code/planner.js';

async function applyClaudePlan(dir: string): Promise<string> {
  const plan = await planClaudeInstall({ projectRoot: dir });
  expect(plan.conflicts).toHaveLength(0);
  const change = plan.changes.find((c) => c.path === '.claude/settings.json')!;
  await writeFile(change.realPath, change.content!, 'utf8');
  return readFile(change.realPath, 'utf8');
}

describe('UT-04: Repeated adapter merge is idempotent (CA-05)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-ut04-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('merges ContextBrake hooks three times idempotently while preserving user hooks', async () => {
    const claudeDir = join(tempDir, '.claude');
    await mkdir(claudeDir, { recursive: true });
    const initialConfig = JSON.stringify({ hooks: { PreToolUse: [{ matcher: 'bash', hook: 'echo user-pre' }] } }, null, 2);
    await writeFile(join(claudeDir, 'settings.json'), initialConfig, 'utf8');
    const content1 = await applyClaudePlan(tempDir);
    const content2 = await applyClaudePlan(tempDir);
    const content3 = await applyClaudePlan(tempDir);
    expect(content2).toBe(content1);
    expect(content3).toBe(content1);
    const parsed = JSON.parse(content3) as { hooks: { PreToolUse: unknown[] } };
    expect(parsed.hooks.PreToolUse).toHaveLength(2);
    expect(parsed.hooks.PreToolUse[0]).toEqual({ matcher: 'bash', hook: 'echo user-pre' });
  });
});
