import { mkdir, mkdtemp, readdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installReportSchema } from '../../src/core/contracts/diagnostics.js';
import { runInProcessCli } from '../helpers/in-process-cli.js';

const CODEX_HOOKS = '{\n  "hooks": {}\n}\n';
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

describe('init --auto-restart on harnesses without Claude Code (prd-14 FR-07, FR-08, NFR-04, DEC-11, DEC-12, TC-13)', () => {
  it('reports the restart mode per harness and installs the restart file and the ignore file', async () => {
    const first = await init(['--auto-restart']);
    expect(first.code).toBe(0);
    const modes = first.report?.findings.filter((finding) => finding.code === 'AUTO_RESTART_MODE').map((finding) => [finding.harness, finding.message]);
    expect(modes).toEqual(expect.arrayContaining([['pi', 'Restart is automatic on pi.'], ['codex-cli', 'Restart is semi-automatic on codex-cli.']]));
    await expect(readFile(join(root, '.context-brake', '.gitignore'), 'utf8')).resolves.toBe('handoff.md\nhandoffs/\n');
    await expect(readFile(join(root, '.pi', 'extensions', 'context-brake-restart.js'), 'utf8')).resolves.toContain('context-brake-restart');
    await expect(readFile(join(root, '.codex', 'hooks.json'), 'utf8')).resolves.toContain('"hooks"');
  });
  it('changes nothing on a second run', async () => {
    await init(['--auto-restart']);
    const second = await init(['--auto-restart']);
    expect(second.report?.plan.changes).toEqual([]);
  });
  it('removes the restart file and the ignore file with --no-auto-restart', async () => {
    await init(['--auto-restart']);
    const off = await init(['--no-auto-restart']);
    expect(off.code).toBe(0);
    const deleted = off.report?.plan.changes.filter((change) => change.kind === 'delete').map((change) => change.path);
    expect(deleted).toEqual(expect.arrayContaining(['.context-brake/.gitignore', '.pi/extensions/context-brake-restart.js']));
  });
});

describe('init --no-auto-restart keeps the handoffs (prd-14 FR-13, DEC-14, TC-14)', () => {
  it('deletes the restart logs and leaves other runtime state (DEC-14, codereview_03 CR-02)', async () => {
    await init(['--auto-restart']);
    await mkdir(join(root, '.context-brake', 'runtime', 'restart', 'pi'), { recursive: true });
    await writeFile(join(root, '.context-brake', 'runtime', 'restart', 'pi', 's1.json'), '{}', 'utf8');
    await writeFile(join(root, '.context-brake', 'runtime', 'keep.json'), '{}', 'utf8');
    const planned = (await init(['--no-auto-restart', '--dry-run'])).report?.plan.changes.filter((change) => change.kind === 'delete').map((change) => change.path);
    expect(planned).toContain('.context-brake/runtime/restart/pi/s1.json');
    const applied = await init(['--no-auto-restart']);
    expect(applied.code).toBe(0);
    expect(applied.report?.status).toBe('success');
    await expect(readFile(join(root, '.context-brake', 'runtime', 'restart', 'pi', 's1.json'), 'utf8')).rejects.toThrow();
    await expect(readdir(join(root, '.context-brake', 'runtime', 'restart'))).rejects.toThrow();
    await expect(readFile(join(root, '.context-brake', 'runtime', 'keep.json'), 'utf8')).resolves.toBe('{}');
  });
  it('names the kept handoffs in the dry run and when applied', async () => {
    await init(['--auto-restart']);
    await mkdir(join(root, '.context-brake', 'handoffs'), { recursive: true });
    await writeFile(join(root, '.context-brake', 'handoff.md'), '# Goal\n', 'utf8');
    const kept = expect.arrayContaining([expect.objectContaining({ code: 'AUTO_RESTART_HANDOFF_KEPT', message: KEPT_MESSAGE })]);
    expect((await init(['--no-auto-restart', '--dry-run'])).report?.findings).toEqual(kept);
    expect((await init(['--no-auto-restart'])).report?.findings).toEqual(kept);
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
    expect(result.code).not.toBe(0);
    expect(result.stdout + result.stderr).toContain('--auto-restart needs at least one active harness with a restart mode');
  });
});
