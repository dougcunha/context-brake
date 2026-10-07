import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installReportSchema } from '../../src/core/contracts/diagnostics.js';
import { readProjectFile, removeProject } from '../helpers/delegated-world.js';
import { changedPaths, createLightProject, PLAIN_INIT, runCli, snapshotTree, USER_AGENTS } from '../helpers/light-world.js';

const DEBUG_INIT = [...PLAIN_INIT, '--debug'] as const;
const DISABLE_PREVIEW = ['init', '--dry-run', '--json', '--no-debug'] as const;
let root: string;
beforeEach(async () => { root = await createLightProject('cb-init-debug-off-'); });
afterEach(async () => { await removeProject(root); });

describe('init --no-debug plan (codereview_01/CR-01, FR-06, DEC-07)', () => {
  it('previews the debug removal only in the configuration and writes nothing', async () => {
    await runCli(root, [...DEBUG_INIT]);
    const before = await snapshotTree(root);
    const report = installReportSchema.parse(JSON.parse((await runCli(root, [...DISABLE_PREVIEW])).stdout));
    const config = report.plan.changes.find((change) => change.path === 'context-brake.config.json');
    expect(config?.preview.summary).toContain('remove the debug mode');
    expect(report.plan.changes.map((change) => change.path).filter((path) => path.endsWith('.md'))).toEqual([]);
    expect(changedPaths(before, await snapshotTree(root))).toEqual([]);
  });
  it('removes the debug key without touching the instruction files', async () => {
    await runCli(root, [...DEBUG_INIT]);
    expect((await runCli(root, [...PLAIN_INIT, '--no-debug'])).code).toBe(0);
    expect(await readProjectFile(root, 'AGENTS.md')).toBe(USER_AGENTS);
  });
});
