import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { doctorReportSchema, type DoctorReport } from '../../src/core/contracts/diagnostics.js';
import { runInProcessCli } from '../helpers/in-process-cli.js';

const COPILOT_CONTEXT = 'Context usage is not exposed to GitHub Copilot CLI hooks.';
const CURSOR_CONTEXT = 'Context usage reaches Cursor hooks only before compaction, so ContextBrake estimates it.';

async function setupRepo(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cb-e2e-support-'));
  await mkdir(join(dir, '.github/copilot'), { recursive: true });
  await mkdir(join(dir, '.cursor'), { recursive: true });
  await writeFile(join(dir, '.github/copilot/settings.json'), '{}\n', 'utf8');
  await writeFile(join(dir, '.cursor/hooks.json'), '{}\n', 'utf8');
  return dir;
}

function supportOf(report: DoctorReport, harness: string): unknown {
  return report.integrations.find((integration) => integration.harness === harness)?.support;
}

describe('E2E support limitations: Copilot and Cursor (TC-03, FR-03, FR-04)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await setupRepo(); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('prints the context usage limitations in init and in doctor with full support and no limitation finding', async () => {
    const init = await runInProcessCli(['init', '--yes'], tempDir);
    expect(init.code).toBe(0);
    expect(init.stdout).toContain(COPILOT_CONTEXT);
    expect(init.stdout).toContain(CURSOR_CONTEXT);
    const report = doctorReportSchema.parse(JSON.parse((await runInProcessCli(['doctor', '--json'], tempDir)).stdout));
    expect(supportOf(report, 'github-copilot-cli')).toMatchObject({ supportLevel: 'full', limitations: expect.arrayContaining([{ capability: 'context_usage', impact: COPILOT_CONTEXT }]) });
    expect(supportOf(report, 'cursor')).toMatchObject({ supportLevel: 'full', limitations: expect.arrayContaining([{ capability: 'context_usage', impact: CURSOR_CONTEXT }]) });
    expect(report.findings.map((finding) => finding.code)).not.toContain('COPILOT_TIMEOUT_LIMITATION');
  });
});
