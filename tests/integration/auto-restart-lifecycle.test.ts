import { mkdir, mkdtemp, readdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { doctorReportSchema, installReportSchema } from '../../src/core/contracts/diagnostics.js';
import { MOD_FILES } from '../../src/infrastructure/harnesses/claude-code/auto-restart-files.js';
import { runInProcessCli } from '../helpers/in-process-cli.js';

const LOCAL = '.claude/settings.local.json';
const BASE_HOOKS = '.claude/settings.json';
const FLOW_TIMEOUT_MILLISECONDS = 120_000;
let base = '';
let root = '';
let env: Record<string, string> = {};

async function tree(dir: string): Promise<Record<string, string>> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  const files = entries.filter((entry) => entry.isFile()).map((entry) => join(entry.parentPath, entry.name));
  const contents = await Promise.all(files.map((file) => readFile(file, 'utf8')));
  return Object.fromEntries(files.map((file, index) => [relative(dir, file).replace(/\\/g, '/'), contents[index] ?? '']));
}

function withoutBaseHooks(files: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(files).filter(([path]) => path !== BASE_HOOKS));
}

async function run(args: readonly string[]): Promise<{ code: number | null; json: unknown }> {
  const result = await runInProcessCli([...args, '--json'], root, env);
  return { code: result.code, json: JSON.parse(result.stdout) as unknown };
}

beforeEach(async () => {
  base = await realpath(await mkdtemp(join(tmpdir(), 'cb-e2e-auto-restart-')));
  root = join(base, 'repo');
  const home = join(base, 'home');
  await mkdir(join(root, '.claude'), { recursive: true });
  await mkdir(join(home, '.claude'), { recursive: true });
  await writeFile(join(root, '.claude', 'settings.json'), '{\n  "hooks": {}\n}\n', 'utf8');
  await writeFile(join(root, LOCAL), '{\n  // mine\n  "permissions": { "allow": [] }\n}\n', 'utf8');
  env = { HOME: home, USERPROFILE: home, PATH: '' };
});
afterEach(async () => { await rm(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('E2E automatic restart install, re-install, doctor and remove (FR-07, FR-08, FR-09, TC-25)', () => {
  it('installs the mod, changes nothing the second time, reports it, and restores the repository', async () => {
    const before = await tree(root);
    const install = await run(['init', '--yes', '--auto-restart']);
    expect(install.code).toBe(0);
    const installed = await tree(root);
    for (const path of MOD_FILES) expect(installed[path]).toBeDefined();
    expect(installed[LOCAL]).toContain('// mine');
    const again = await run(['init', '--yes']);
    expect(again.code).toBe(0);
    expect(installReportSchema.parse(again.json).plan.changes).toEqual([]);
    expect(await tree(root)).toEqual(installed);
    const doctor = await run(['doctor', '--harness', 'claude-code']);
    const report = doctorReportSchema.parse(doctor.json);
    expect(report.findings.find((finding) => finding.code.startsWith('AUTO_RESTART_'))?.code).toBe('AUTO_RESTART_NOT_LOADED');
    expect(doctor.code).toBe(report.exitCode);
    const remove = await run(['remove', '--yes']);
    expect(remove.code).toBe(0);
    expect(withoutBaseHooks(await tree(root))).toEqual(withoutBaseHooks(before));
  }, FLOW_TIMEOUT_MILLISECONDS);
});

describe('E2E automatic restart with the status line opt-out (FR-07, DEC-08, CR-01)', () => {
  it('keeps the loader keys when the opt-out removes the bridge-created local settings, then changes nothing', async () => {
    await rm(join(root, LOCAL));
    await run(['init', '--yes', '--statusline-bridge']);
    const optOut = await run(['init', '--yes', '--auto-restart', '--no-statusline-bridge']);
    expect(optOut.code).toBe(0);
    const local = JSON.parse((await tree(root))[LOCAL] ?? '{}') as Record<string, unknown>;
    expect(Object.keys(local).sort()).toEqual(['enabledPlugins', 'extraKnownMarketplaces']);
    const installed = await tree(root);
    const again = await run(['init', '--yes']);
    expect(installReportSchema.parse(again.json).plan.changes).toEqual([]);
    expect(await tree(root)).toEqual(installed);
  }, FLOW_TIMEOUT_MILLISECONDS);
});

describe('E2E automatic restart removal without a prior local settings file (FR-09, codereview_02 CR-01)', () => {
  it('restores the repository, local settings file included, after install and remove', async () => {
    await rm(join(root, LOCAL));
    const before = await tree(root);
    expect((await run(['init', '--yes', '--auto-restart'])).code).toBe(0);
    expect((await run(['remove', '--yes'])).code).toBe(0);
    expect(withoutBaseHooks(await tree(root))).toEqual(withoutBaseHooks(before));
  }, FLOW_TIMEOUT_MILLISECONDS);
});

describe('E2E automatic restart removal keeps a user-created empty local settings file (FR-09, codereview_03 CR-01)', () => {
  it('leaves the user file in place after install and remove', async () => {
    await writeFile(join(root, LOCAL), '{}\n', 'utf8');
    expect((await run(['init', '--yes', '--auto-restart'])).code).toBe(0);
    expect((await run(['remove', '--yes'])).code).toBe(0);
    expect((await tree(root))[LOCAL]?.replace(/\s/g, '')).toBe('{}');
  }, FLOW_TIMEOUT_MILLISECONDS);
});
