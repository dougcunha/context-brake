import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { detectHarnesses } from '../../src/core/services/detection-service.js';
import { ClaudeAdapter } from '../../src/infrastructure/harnesses/claude-code/adapter.js';
import { CodexAdapter } from '../../src/infrastructure/harnesses/codex-cli/adapter.js';
import { CursorAdapter } from '../../src/infrastructure/harnesses/cursor/adapter.js';

describe('IT-02 & IT-03: multi-harness install and exclusion (CA-02, CA-04)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cb-multi-a-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('IT-02: installs Codex and Cursor together without conflict (CA-02)', async () => {
    await mkdir(join(tempDir, '.codex'), { recursive: true });
    await mkdir(join(tempDir, '.cursor'), { recursive: true });
    const codexPlan = await new CodexAdapter().planInstall({ projectRoot: tempDir });
    const cursorPlan = await new CursorAdapter().planInstall({ projectRoot: tempDir });
    expect(codexPlan.conflicts).toHaveLength(0);
    expect(cursorPlan.conflicts).toHaveLength(0);
  });

  it('IT-03: explicit Copilot exclusion leaves only Cursor (CA-04)', () => {
    const copilotEvidence = [{ origin: 'project' as const, kind: 'config', value: '.github/copilot/settings.json' }];
    const cursorEvidence = [{ origin: 'project' as const, kind: 'config', value: '.cursor/hooks.json' }];
    const detections = detectHarnesses(
      { 'github-copilot-cli': { project: copilotEvidence }, cursor: { project: cursorEvidence } },
      { exclude: ['github-copilot-cli'] }
    );
    expect(detections.find((d) => d.harness === 'github-copilot-cli')?.state).toBe('excluded');
    expect(detections.find((d) => d.harness === 'cursor')?.state).toBe('project');
  });
});

describe('IT-04: malformed harness isolation (CA-06)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cb-multi-b-'));
    await mkdir(join(tempDir, '.claude'), { recursive: true });
    await mkdir(join(tempDir, '.codex'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('malformed harness config isolates conflict and does not block peers', async () => {
    await writeFile(join(tempDir, '.claude/settings.json'), '{ invalid json', 'utf8');
    await writeFile(join(tempDir, '.codex/hooks.json'), '{\n  "hooks": {}\n}\n', 'utf8');
    const claudePlan = await new ClaudeAdapter().planInstall({ projectRoot: tempDir });
    const codexPlan = await new CodexAdapter().planInstall({ projectRoot: tempDir });
    expect(claudePlan.conflicts).toHaveLength(1);
    expect(claudePlan.conflicts[0]?.code).toBe('INVALID_HARNESS_CONFIG');
    expect(codexPlan.conflicts).toHaveLength(0);
  });
});
