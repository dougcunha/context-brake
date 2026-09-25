import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { doctorReportSchema } from '../../src/core/contracts/diagnostics.js';
import { attemptGit, requireGit, runGit } from '../helpers/git-capability.js';
import { writeRuntimeConfig } from '../helpers/runtime-seed.js';
import { brakeWorkFlow, deniedRead, operatorTrap, saveSequence, workStep } from '../support/harness-simulator/agent-profiles.js';
import { createProcessSession, installHarness } from '../support/harness-simulator/process-driver.js';
import { SessionRecorder, initializeRepository, lastCommitSubject, runScript } from '../support/harness-simulator/session-recorder.js';
import { CHECKPOINT_FILE, PLAN_FILE, checkpointContent, planContent, shellCall } from '../support/harness-simulator/scenarios.js';
import { runBuiltCli } from './cli-runner.js';

const CLAUDE_SESSION = 'brake-e2e-claude';
const LARGE_READ_CHARACTERS = 3700;
const CODEX_SESSION = 'brake-e2e-codex';

async function createFixture(harness: 'claude-code' | 'codex-cli'): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'cb-t09-brake-'));
  await mkdir(join(root, 'src'), { recursive: true });
  await writeFile(join(root, 'src/app.ts'), 'export const app = true;\n', 'utf8');
  await writeFile(join(root, 'src/util.ts'), 'export const util = 1;\n', 'utf8');
  await writeRuntimeConfig(root, 32000);
  const config = harness === 'claude-code' ? ['.claude', '.claude/settings.json'] : ['.codex', '.codex/hooks.json'];
  await mkdir(join(root, config[0]!), { recursive: true });
  await writeFile(join(root, config[1]!), '{\n  "hooks": {}\n}\n', 'utf8');
  await initializeRepository(root);
  await installHarness(root, harness);
  await runGit(['add', '-A'], root);
  await runGit(['commit', '-m', 'install context-brake'], root);
  await writeFile(join(root, PLAN_FILE), planContent(), 'utf8');
  await writeFile(join(root, CHECKPOINT_FILE), checkpointContent(), 'utf8');
  return root;
}
async function driveClaude(root: string, recorder: SessionRecorder): Promise<void> {
  const session = createProcessSession({ root, harness: 'claude-code', sessionId: CLAUDE_SESSION });
  const input = { channel: session, harness: 'claude-code', recorder, root };
  await runScript(input, brakeWorkFlow(LARGE_READ_CHARACTERS));
  for (const [id, text] of [['work-1', 'turn=1 '], ['work-1', 'zone=YELLOW'], ['work-6', 'zone=RED'], ['work-9', 'zone=CRITICAL']] as const) expect(recorder.find(id)?.block).toContain(text);
  await runScript(input, [deniedRead('critical-read-code', 'src/app.ts'), ...saveSequence(), operatorTrap('critical-operator')]);
}
async function assertClaudeResult(root: string, recorder: SessionRecorder): Promise<void> {
  const denied = JSON.parse(recorder.find('critical-read-code')?.response ?? '{}') as { hookSpecificOutput?: { permissionDecision?: string; permissionDecisionReason?: string } };
  expect(denied.hookSpecificOutput?.permissionDecision).toBe('deny');
  expect(denied.hookSpecificOutput?.permissionDecisionReason).toContain('tool=Read');
  expect(denied.hookSpecificOutput?.permissionDecisionReason).toContain('reason=critical_ceiling');
  expect(recorder.find('critical-operator')?.outcome).toBe('denied');
  for (const id of ['save-read-plan', 'save-read-checkpoint', 'save-write-checkpoint', 'save-validation', 'save-git-status', 'save-git-add', 'save-git-commit']) expect(recorder.find(id)?.outcome, recorder.report()).toBe('executed');
  expect(JSON.parse(await readFile(join(root, 'state_checkpoint.json'), 'utf8'))).toMatchObject({ schemaVersion: 1 });
  expect(await lastCommitSubject(root)).toBe('checkpoint: step 1');
  expect(await readFile(join(root, 'src/app.ts'), 'utf8')).toBe('export const app = true;\n');
  expect(await readFile(join(root, 'src/util.ts'), 'utf8')).toBe('export const util = 1;\n');
  expect(existsSync(join(root, 'src/generated.ts'))).toBe(false);
  const blocks = await readFile(join(root, '.context-brake/runtime/blocks.jsonl'), 'utf8');
  expect(blocks).toContain('"tool":"Read"');
  expect(blocks).toContain('"reason":"critical_ceiling"');
  expect(blocks).not.toContain('app.ts');
}
async function assertDoctor(root: string): Promise<void> {
  const json = await runBuiltCli(['doctor', '--json'], root);
  expect(json.code).toBe(1);
  const report = doctorReportSchema.parse(JSON.parse(json.stdout));
  expect(report.findings.some((finding) => finding.code === 'BRAKE_BLOCKS_RECORDED' && finding.severity === 'ok')).toBe(true);
  expect(report.findings.some((finding) => finding.code === 'BRAKE_COOPERATIVE' && finding.harness === 'claude-code')).toBe(false);
  const text = await runBuiltCli(['doctor'], root);
  for (const finding of report.findings) expect(text.stdout).toContain(`${finding.code}: ${finding.message}`);
}
async function assertCodexCooperative(root: string, recorder: SessionRecorder): Promise<void> {
  expect(recorder.records.every((record) => record.outcome === 'executed')).toBe(true);
  const json = await runBuiltCli(['doctor', '--json'], root);
  expect(json.code).toBe(1);
  const report = doctorReportSchema.parse(JSON.parse(json.stdout));
  const finding = report.findings.find((item) => item.code === 'BRAKE_COOPERATIVE' && item.harness === 'codex-cli');
  expect(finding?.severity).toBe('warning');
  expect(finding?.impact).toBe('Hosted tools such as web search bypass Codex CLI hooks.');
  expect(finding?.message).toContain(CODEX_SESSION);
  const text = await runBuiltCli(['doctor'], root);
  expect(text.stdout).toContain(`BRAKE_COOPERATIVE: ${finding?.message}`);
}

describe('T09 end-to-end brake flow (TC-27, CA-01, CA-14, CA-15, CA-18)', () => {
  const roots: string[] = [];
  afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }))); });

  it('drives Claude Code from GREEN to CRITICAL with the documented block, deny, and save sequence', async (ctx) => {
    await requireGit(ctx, await attemptGit());
    const root = await createFixture('claude-code');
    roots.push(root);
    const recorder = new SessionRecorder();
    await driveClaude(root, recorder);
    await assertClaudeResult(root, recorder);
    await assertDoctor(root);
  }, 180000);

  it('reports the Codex CLI cooperative brake with text and JSON parity', async (ctx) => {
    await requireGit(ctx, await attemptGit());
    const root = await createFixture('codex-cli');
    roots.push(root);
    const session = createProcessSession({ root, harness: 'codex-cli', sessionId: CODEX_SESSION });
    const recorder = new SessionRecorder();
    await runScript({ channel: session, harness: 'codex-cli', recorder, root }, [workStep(shellCall('codex-work-1', 'git status', ['status']))]);
    await assertCodexCooperative(root, recorder);
  }, 180000);
});

