import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CopilotAdapter } from '../../src/infrastructure/harnesses/github-copilot-cli/adapter.js';

describe('IT-12: Copilot hook configuration (CA-15)', () => {
  let tempDir: string;
  const adapter = new CopilotAdapter();

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cb-it12-'));
    await mkdir(join(tempDir, '.github/hooks'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('generates dedicated hook file avoiding shell interpolation', async () => {
    const plan = await adapter.planInstall({ projectRoot: tempDir });
    expect(plan.conflicts).toHaveLength(0);
    const configChange = plan.changes.find((c) => c.path === '.github/hooks/context-brake.json');
    expect(configChange).toBeDefined();
    const parsed = JSON.parse(configChange?.content ?? '{}') as { hooks?: { preToolUse?: { exec?: string }[] } };
    expect(parsed.hooks?.preToolUse?.[0]?.exec).toBe('node');
  });
});

describe('IT-12: Copilot failure policy and diagnosis (CA-15)', () => {
  let tempDir: string;
  const adapter = new CopilotAdapter();

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cb-it12-diag-'));
    await mkdir(join(tempDir, '.github/hooks'), { recursive: true });
    await writeFile(join(tempDir, '.github/hooks/context-brake.json'), '{\n  "version": 1\n}\n', 'utf8');
    await writeFile(join(tempDir, '.github/hooks/context-brake.mjs'), '/* runtime */', 'utf8');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('reports full support with a timeout limitation and no warning finding (TC-03, CA-15)', async () => {
    const profile = adapter.capabilityProfile();
    expect(profile.supportLevel).toBe('full');
    const timeoutLimitation = profile.limitations.find((limitation) => limitation.capability === 'timeout_fail_closed');
    expect(timeoutLimitation?.impact).toContain('a command failure without a timeout denies it');
    const findings = await adapter.diagnose({ projectRoot: tempDir });
    expect(findings.find((f) => f.code === 'COPILOT_TIMEOUT_LIMITATION')).toBeUndefined();
    expect(findings.find((f) => f.code === 'INVALID_HARNESS_CONFIG')).toBeUndefined();
  });
});
