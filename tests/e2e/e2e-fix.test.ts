import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fixReportSchema } from '../../src/core/contracts/fix-report.js';
import { runBuiltCli } from './cli-runner.js';

const HOOK = '.claude/hooks/context-brake.mjs';
const MANIFEST = '.context-brake/manifest.json';
const STALE_HOOK = '// hook from an older ContextBrake package\n';

let root: string;

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

async function makeHookOutdated(): Promise<void> {
  const manifest = JSON.parse(await readFile(join(root, MANIFEST), 'utf8')) as { assets: { path: string; sha256: string }[] };
  const asset = manifest.assets.find((entry) => entry.path === HOOK);
  if (asset) asset.sha256 = sha256(STALE_HOOK);
  await writeFile(join(root, HOOK), STALE_HOOK, 'utf8');
  await writeFile(join(root, MANIFEST), JSON.stringify(manifest, null, 2), 'utf8');
}

async function hashes(): Promise<string[]> {
  return Promise.all([HOOK, MANIFEST, 'context-brake.config.json'].map(async (path) => sha256(await readFile(join(root, path), 'utf8'))));
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cb-smoke-fix-'));
  await mkdir(join(root, '.claude'), { recursive: true });
  await writeFile(join(root, '.claude/settings.json'), '{\n  "hooks": {}\n}\n', 'utf8');
});
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('built CLI fix smoke (prd-24 FR-14, TC-21)', () => {
  it('plans the fix of an outdated hook as a schema-valid report and changes no file', async () => {
    expect((await runBuiltCli(['init', '--yes'], root)).code).toBe(0);
    await makeHookOutdated();
    const before = await hashes();
    const run = await runBuiltCli(['fix', '--dry-run', '--json'], root);
    const report = fixReportSchema.parse(JSON.parse(run.stdout));
    expect([run.code, report.mode]).toEqual([report.exitCode, 'dry_run']);
    expect(report.outcomes.find((item) => item.code === 'ASSET_OUTDATED')?.outcome).toBe('planned');
    expect(await hashes()).toEqual(before);
  });
});
