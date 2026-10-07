import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { doctorReportSchema } from '../../src/core/contracts/diagnostics.js';
import { attemptGit, requireGit, runGit } from '../helpers/git-capability.js';
import { writeRuntimeConfig, seedBridgeWindow } from '../helpers/runtime-seed.js';
import { brakeWorkFlow, criticalCalls } from '../support/harness-simulator/agent-profiles.js';
import { createProcessSession, installHarness } from '../support/harness-simulator/process-driver.js';
import { SessionRecorder, initializeRepository, runScript } from '../support/harness-simulator/session-recorder.js';
import { runBuiltCli } from './cli-runner.js';

const CLAUDE_SESSION = 'brake-e2e-claude';
const LARGE_READ_CHARACTERS = 3700;
const E2E_TIMEOUT_MS = 180000;

async function createFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'cb-brake-'));
  await mkdir(join(root, 'src'), { recursive: true });
  await writeFile(join(root, 'src/app.ts'), 'export const app = true;\n', 'utf8');
  await writeRuntimeConfig(root, 32000);
  await mkdir(join(root, '.claude'), { recursive: true });
  await writeFile(join(root, '.claude/settings.json'), '{\n  "hooks": {}\n}\n', 'utf8');
  await initializeRepository(root);
  await installHarness(root, 'claude-code');
  await runGit(['add', '-A'], root);
  await runGit(['commit', '-m', 'install context-brake'], root);
  return root;
}

describe('advisory brake end to end (prd-12 FR-07, DEC-06)', () => {
  const roots: string[] = [];
  afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }))); });

  it('drives Claude Code from GREEN to CRITICAL and completes every tool call', async (ctx) => {
    await requireGit(ctx, await attemptGit());
    const root = await createFixture();
    roots.push(root);
    await seedBridgeWindow(root, { harness: 'claude-code', sessionId: CLAUDE_SESSION, agentId: null }, 32000);
    const recorder = new SessionRecorder();
    const input = { channel: createProcessSession({ root, harness: 'claude-code', sessionId: CLAUDE_SESSION }), harness: 'claude-code', recorder, root };
    await runScript(input, [...brakeWorkFlow(LARGE_READ_CHARACTERS), ...criticalCalls()]);
    for (const [id, text] of [['work-1', 'turn=1 '], ['work-1', 'zone=YELLOW'], ['work-6', 'zone=RED'], ['work-9', 'zone=CRITICAL']] as const) expect(recorder.find(id)?.block).toContain(text);
    expect(recorder.records.every((record) => record.outcome === 'executed'), recorder.report()).toBe(true);
    expect(await readFile(join(root, 'src/generated.ts'), 'utf8')).toBe('export const generated = true;\n');
    const report = doctorReportSchema.parse(JSON.parse((await runBuiltCli(['doctor', '--json'], root)).stdout));
    expect(report.findings.filter((finding) => finding.code.startsWith('BRAKE_'))).toEqual([]);
  }, E2E_TIMEOUT_MS);
});
