import { mkdir, mkdtemp, readdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installReportSchema } from '../../src/core/contracts/diagnostics.js';
import { runInProcessCli } from '../helpers/in-process-cli.js';

const CODEX_HOOKS = '{\n  "hooks": {}\n}\n';
const USAGE_EXIT = 64;
const KEPT_MESSAGE = 'Session handoffs were kept: .context-brake/handoff.md, .context-brake/handoffs/.';
let base = '';
let root = '';
let env: Record<string, string> = {};

async function init(args: readonly string[]): Promise<{ code: number; report: ReturnType<typeof installReportSchema.parse> | null; stderr: string }> {
  const result = await runInProcessCli(['init', '--yes', '--json', ...args], root, env);
  const report = result.stdout.trim() === '' ? null : installReportSchema.safeParse(JSON.parse(result.stdout));
  return { code: result.code, report: report?.success === true ? report.data : null, stderr: result.stderr };
}

beforeEach(async () => {
  base = await realpath(await mkdtemp(join(tmpdir(), 'cb-init-restart-')));
  root = join(base, 'repo');
  const home = join(base, 'home');
  await mkdir(join(root, '.pi'), { recursive: true });
  await mkdir(join(root, '.codex'), { recursive: true });
  await mkdir(home, { recursive: true });
  await writeFile(join(root, '.pi', 'settings.json'), '{}\n', 'utf8');
  await writeFile(join(root, '.codex', 'hooks.json'), CODEX_HOOKS, 'utf8');
  env = { HOME: home, USERPROFILE: home, PATH: '' };
});
afterEach(async () => { await rm(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

async function seedRestartState(): Promise<void> {
  await mkdir(join(root, '.context-brake', 'runtime', 'restart', 'pi'), { recursive: true });
  await mkdir(join(root, '.context-brake', 'handoffs'), { recursive: true });
  await writeFile(join(root, '.context-brake', 'runtime', 'restart', 'pi', 's1.json'), '{}', 'utf8');
  await writeFile(join(root, '.context-brake', 'runtime', 'keep.json'), '{}', 'utf8');
  await writeFile(join(root, '.context-brake', 'handoff.md'), '# Goal\n', 'utf8');
}

function deletedPaths(report: Awaited<ReturnType<typeof init>>['report']): string[] | undefined {
  return report?.plan.changes.filter((change) => change.kind === 'delete').map((change) => change.path);
}

describe('init --auto-restart on harnesses without Claude Code (prd-14 FR-07, FR-08, NFR-04, DEC-11, DEC-12, TC-13)', () => {
  it('reports the restart mode per harness, installs the restart file and the ignore file, and changes nothing on a second run', async () => {
    const first = await init(['--auto-restart']);
    expect(first.code).toBe(0);
    const modes = first.report?.findings.filter((finding) => finding.code === 'AUTO_RESTART_MODE').map((finding) => [finding.harness, finding.message]);
    expect(modes).toEqual(expect.arrayContaining([['pi', 'Restart is automatic on pi.'], ['codex-cli', 'Restart is semi-automatic on codex-cli.']]));
    await expect(readFile(join(root, '.context-brake', '.gitignore'), 'utf8')).resolves.toBe('handoff.md\nhandoffs/\n');
    await expect(readFile(join(root, '.pi', 'extensions', 'context-brake-restart.js'), 'utf8')).resolves.toContain('context-brake-restart');
    await expect(readFile(join(root, '.codex', 'hooks.json'), 'utf8')).resolves.toContain('"hooks"');
    expect((await init(['--auto-restart'])).report?.plan.changes).toEqual([]);
  });
});

describe('init --no-auto-restart keeps the handoffs (prd-14 FR-07, FR-13, DEC-14, TC-14, codereview_03 CR-02)', () => {
  it('previews and applies the deletion of the restart file, ignore file, and restart logs, keeping other runtime state and naming the kept handoffs', async () => {
    await init(['--auto-restart']);
    await seedRestartState();
    const kept = expect.arrayContaining([expect.objectContaining({ code: 'AUTO_RESTART_HANDOFF_KEPT', message: KEPT_MESSAGE })]);
    const preview = await init(['--no-auto-restart', '--dry-run']);
    expect(deletedPaths(preview.report)).toEqual(expect.arrayContaining(['.context-brake/.gitignore', '.pi/extensions/context-brake-restart.js', '.context-brake/runtime/restart/pi/s1.json']));
    expect(preview.report?.findings).toEqual(kept);
    const applied = await init(['--no-auto-restart']);
    expect([applied.code, applied.report?.status]).toEqual([0, 'success']);
    expect(applied.report?.findings).toEqual(kept);
    await expect(readdir(join(root, '.context-brake', 'runtime', 'restart'))).rejects.toThrow();
    await expect(readFile(join(root, '.pi', 'extensions', 'context-brake-restart.js'), 'utf8')).rejects.toThrow();
    await expect(readFile(join(root, '.context-brake', 'runtime', 'keep.json'), 'utf8')).resolves.toBe('{}');
    await expect(readFile(join(root, '.context-brake', 'handoff.md'), 'utf8')).resolves.toBe('# Goal\n');
  });
});

describe('init --auto-restart target check (prd-14 DEC-11, TC-13)', () => {
  it('fails with a clear message when no active harness has a restart mode', async () => {
    await rm(join(root, '.pi'), { recursive: true, force: true });
    await rm(join(root, '.codex'), { recursive: true, force: true });
    await mkdir(join(root, '.agents'), { recursive: true });
    await writeFile(join(root, '.agents', 'hooks.json'), '{}\n', 'utf8');
    const result = await runInProcessCli(['init', '--yes', '--json', '--auto-restart'], root, env);
    expect(result.code).toBe(USAGE_EXIT);
    expect(result.stdout + result.stderr).toContain('--auto-restart needs at least one active harness with a restart mode');
  });
});
