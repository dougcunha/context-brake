import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DoctorReport } from '../../src/core/contracts/diagnostics.js';
import { CONFIG_PATH, PROTOCOL_PATH, readConfig, removeProject, runCli } from '../helpers/delegated-world.js';
import { createLightProject, FULL_INIT, LIGHT_INIT } from '../helpers/light-world.js';

const FULL_MODE_CODES = ['PROTOCOL_FILE_MISSING', 'PROTOCOL_FILE_MISMATCH', 'INSTRUCTION_REFERENCE_MISSING', 'STATE_FILES_NOT_IGNORED', 'INVALID_STATE_FILE'];
let root: string;
beforeEach(async () => { root = await createLightProject('cb-doctor-light-'); });
afterEach(async () => { await removeProject(root); });

async function doctor(): Promise<DoctorReport> {
  return JSON.parse((await runCli(root, ['doctor', '--json'])).stdout) as DoctorReport;
}
function codes(report: DoctorReport): string[] {
  return report.findings.map((finding) => finding.code);
}

describe('doctor in light mode (TC-09, FR-11, FR-12)', () => {
  it('reports the light mode and runs no full-mode file check on a clean install', async () => {
    await runCli(root, [...LIGHT_INIT]);
    await writeFile(join(root, 'task_plan.json'), '{not json', 'utf8');
    const report = await doctor();
    expect(report.checkpointMode).toEqual({ effective: 'light', reason: 'light_mode', delegatedSnapshot: null, lightMode: { triggerZone: 'RED' } });
    expect(codes(report).filter((code) => FULL_MODE_CODES.includes(code) || code === 'LIGHT_MODE_LEFTOVER')).toEqual([]);
  });
  it('flags a leftover reference block and a protocol still in the manifest', async () => {
    await runCli(root, [...FULL_INIT]);
    const config = await readConfig(root);
    await writeFile(join(root, CONFIG_PATH), JSON.stringify({ ...config, lightMode: { triggerZone: 'YELLOW' } }), 'utf8');
    const leftovers = (await doctor()).findings.filter((finding) => finding.code === 'LIGHT_MODE_LEFTOVER');
    expect(leftovers.map((finding) => finding.path).sort()).toEqual(['AGENTS.md', 'CLAUDE.md', PROTOCOL_PATH]);
    expect(leftovers.every((finding) => finding.severity === 'warning' && finding.remediation === 'Run context-brake init --yes.')).toBe(true);
  });
  it('reports an inactive delegated section and no delegated warnings', async () => {
    await runCli(root, ['init', '--yes', '--json', '--snapshot-command', '/sdd-snapshot']);
    await runCli(root, [...LIGHT_INIT]);
    const report = await doctor();
    expect(codes(report)).toContain('DELEGATED_SNAPSHOT_INACTIVE');
    expect(codes(report)).not.toContain('DELEGATED_SNAPSHOT_NO_PATHS');
    expect(report.checkpointMode).toMatchObject({ effective: 'light', delegatedSnapshot: expect.objectContaining({ snapshotCommand: '/sdd-snapshot' }) });
  });
  it('prints the light mode line in text output', async () => {
    await runCli(root, [...LIGHT_INIT, '--snapshot-trigger', 'YELLOW']);
    const run = await runCli(root, ['doctor']);
    expect(run.stdout + run.stderr).toContain('  - checkpoint mode: light (trigger: YELLOW)\n');
  });
});

describe('doctor outside light mode (TC-09, NFR-01)', () => {
  it('keeps the checkpoint mode report without a lightMode key', async () => {
    await runCli(root, [...FULL_INIT]);
    const report = await doctor();
    expect(report.checkpointMode).toEqual({ effective: 'plan', reason: 'no_section', delegatedSnapshot: null });
    expect(codes(report)).not.toContain('LIGHT_MODE_LEFTOVER');
  });
});
