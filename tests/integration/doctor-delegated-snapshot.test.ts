import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DoctorReport } from '../../src/core/contracts/diagnostics.js';
import { CONFIG_PATH, createClaudeProject, PROTOCOL_PATH, readConfig, removeProject, runCli } from '../helpers/delegated-world.js';

const SECTION = ['--snapshot-command', '/sdd-snapshot', '--snapshot-path', 'tasks/**/context-snapshot.md'];
let root: string;
beforeEach(async () => { root = await createClaudeProject('cb-doctor-delegated-'); });
afterEach(async () => { await removeProject(root); });

async function doctor(): Promise<DoctorReport> {
  return JSON.parse((await runCli(root, ['doctor', '--json'])).stdout) as DoctorReport;
}
function codes(report: DoctorReport): string[] {
  return report.findings.map((finding) => finding.code);
}

describe('doctor in delegated snapshot mode (TC-12, FR-11, FR-13)', () => {
  it('reports the delegated mode without state file findings when the plan is missing', async () => {
    await runCli(root, ['init', '--yes', '--json', ...SECTION]);
    const report = await doctor();
    expect(report.checkpointMode).toEqual({ effective: 'delegated', reason: 'plan_missing', delegatedSnapshot: expect.objectContaining({ snapshotCommand: '/sdd-snapshot' }) });
    expect(codes(report)).not.toContain('INVALID_STATE_FILE');
    expect(codes(report)).not.toContain('DELEGATED_SNAPSHOT_NO_PATHS');
  });
  it('reports plan mode while the plan file exists', async () => {
    await runCli(root, ['init', '--yes', '--json', ...SECTION]);
    await writeFile(join(root, 'task_plan.json'), '{}', 'utf8');
    expect((await doctor()).checkpointMode).toMatchObject({ effective: 'plan', reason: 'plan_present' });
  });
  it('reports plan mode without the section', async () => {
    await runCli(root, ['init', '--yes', '--json']);
    expect((await doctor()).checkpointMode).toEqual({ effective: 'plan', reason: 'no_section', delegatedSnapshot: null });
  });
  it('warns when no path is allowed', async () => {
    await runCli(root, ['init', '--yes', '--json', '--snapshot-command', '/sdd-snapshot']);
    expect(codes(await doctor())).toContain('DELEGATED_SNAPSHOT_NO_PATHS');
  });
  it('flags a protocol generated before the section was added', async () => {
    await runCli(root, ['init', '--yes', '--json']);
    const config = await readConfig(root);
    await writeFile(join(root, CONFIG_PATH), JSON.stringify({ ...config, delegatedSnapshot: { snapshotCommand: '/sdd-snapshot', allowedPaths: ['a/*.md'] } }), 'utf8');
    expect((await doctor()).findings.some((finding) => finding.path === PROTOCOL_PATH)).toBe(true);
  });
});
