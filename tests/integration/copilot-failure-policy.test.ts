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

  it('reports partial support and timeout limitation during diagnosis', async () => {
    expect(adapter.capabilityProfile().supportLevel).toBe('partial');
    const findings = await adapter.diagnose({ projectRoot: tempDir });
    const timeoutFinding = findings.find((f) => f.code === 'COPILOT_TIMEOUT_LIMITATION');
    expect(timeoutFinding?.impact).toBe('A timed-out hook lets the tool call continue.');
  });
});
