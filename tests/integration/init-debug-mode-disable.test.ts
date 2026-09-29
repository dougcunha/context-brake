import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installReportSchema } from '../../src/core/contracts/diagnostics.js';
import { CURRENT_END_MARKER } from '../../src/core/services/instruction-markers.js';
import { readProjectFile, removeProject } from '../helpers/delegated-world.js';
import { changedPaths, createLightProject, FULL_INIT, LEGACY_DEBUG_MODE_LINE, LIGHT_INIT, runCli, snapshotTree } from '../helpers/light-world.js';

const DEBUG_INIT = [...FULL_INIT, '--debug'] as const;
const DISABLE_PREVIEW = ['init', '--dry-run', '--json', '--no-debug'] as const;
const PROTOCOL_PATH = 'docs/context-brake-protocol.md';
let root: string;
beforeEach(async () => { root = await createLightProject('cb-init-debug-off-'); });
afterEach(async () => { await removeProject(root); });

describe('init --no-debug plan (codereview_01/CR-01, FR-06, DEC-07)', () => {
  it('previews the debug removal in the configuration and the protocol, and writes nothing', async () => {
    await runCli(root, [...DEBUG_INIT]);
    const before = await snapshotTree(root);
    const report = installReportSchema.parse(JSON.parse((await runCli(root, [...DISABLE_PREVIEW, '--no-light'])).stdout));
    const config = report.plan.changes.find((change) => change.path === 'context-brake.config.json');
    expect(config?.preview.summary).toContain('remove the debug mode');
    const paths = report.plan.changes.map((change) => change.path);
    expect(paths).toContain(PROTOCOL_PATH);
    expect(paths.filter((path) => path.endsWith('.md') && path !== PROTOCOL_PATH)).toEqual([]);
    expect(changedPaths(before, await snapshotTree(root))).toEqual([]);
  });
  it('removes the debug key in light mode without touching the instruction files', async () => {
    await runCli(root, [...LIGHT_INIT, '--debug']);
    expect((await runCli(root, [...LIGHT_INIT, '--no-debug'])).code).toBe(0);
    expect(await readProjectFile(root, 'AGENTS.md')).toBe('# Agent rules\n\nStay here.\n');
  });
});

describe('init removes a debug line left by an older version (codereview_01/CR-01, FR-06, DEC-07)', () => {
  it('drops the line from the block and keeps the rest of the file byte for byte', async () => {
    await runCli(root, [...FULL_INIT]);
    const plain = await readProjectFile(root, 'AGENTS.md');
    await writeFile(join(root, 'AGENTS.md'), plain.replace(CURRENT_END_MARKER, `${LEGACY_DEBUG_MODE_LINE}\n${CURRENT_END_MARKER}`), 'utf8');
    expect((await runCli(root, [...FULL_INIT])).code).toBe(0);
    expect(await readProjectFile(root, 'AGENTS.md')).toBe(plain);
  });
});
