import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installReportSchema } from '../../src/core/contracts/diagnostics.js';
import { CURRENT_END_MARKER, DEBUG_MODE_LINE } from '../../src/core/services/instruction-markers.js';
import { readProjectFile, removeProject } from '../helpers/delegated-world.js';
import { changedPaths, createLightProject, FULL_INIT, runCli, snapshotTree } from '../helpers/light-world.js';

const DEBUG_INIT = [...FULL_INIT, '--debug'] as const;
const DISABLE_PREVIEW = ['init', '--dry-run', '--json', '--no-debug'] as const;
let root: string;
beforeEach(async () => { root = await createLightProject('cb-init-debug-off-'); });
afterEach(async () => { await removeProject(root); });

describe('init --no-debug plan (codereview_01/CR-01, FR-06, DEC-06)', () => {
  it('previews the debug removal in the config and instruction files and writes nothing', async () => {
    await runCli(root, [...DEBUG_INIT]);
    const before = await snapshotTree(root);
    const report = installReportSchema.parse(JSON.parse((await runCli(root, [...DISABLE_PREVIEW])).stdout));
    const config = report.plan.changes.find((change) => change.path === 'context-brake.config.json');
    expect(config?.preview.summary).toContain('remove the debug mode');
    expect(report.plan.changes.map((change) => change.path)).toEqual(expect.arrayContaining(['AGENTS.md', 'CLAUDE.md']));
    expect(changedPaths(before, await snapshotTree(root))).toEqual([]);
  });
});

describe('init debug drift with the mode off (codereview_01/CR-01, FR-06, DEC-08)', () => {
  it('removes a debug line left in the block on the next init and keeps the rest of the file', async () => {
    await runCli(root, [...FULL_INIT]);
    const plain = await readProjectFile(root, 'AGENTS.md');
    await writeFile(join(root, 'AGENTS.md'), plain.replace(CURRENT_END_MARKER, `${DEBUG_MODE_LINE}\n${CURRENT_END_MARKER}`), 'utf8');
    expect((await runCli(root, [...FULL_INIT])).code).toBe(0);
    expect(await readProjectFile(root, 'AGENTS.md')).toBe(plain);
  });
});
