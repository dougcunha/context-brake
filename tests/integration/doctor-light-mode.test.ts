import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DoctorReport } from '../../src/core/contracts/diagnostics.js';
import { removeProject, runCli } from '../helpers/delegated-world.js';
import { createLightProject, LIGHT_INIT } from '../helpers/light-world.js';

const REMOVED_CODES = ['PROTOCOL_FILE_MISSING', 'PROTOCOL_FILE_MISMATCH', 'INSTRUCTION_REFERENCE_MISSING', 'STATE_FILES_NOT_IGNORED', 'INVALID_STATE_FILE', 'DELEGATED_SNAPSHOT_INACTIVE', 'DELEGATED_SNAPSHOT_NO_PATHS', 'LIGHT_MODE_DEFAULT_PENDING', 'LIGHT_MODE_LEFTOVER', 'LIGHT_MODE_ASSET_KEPT', 'MALFORMED_GITIGNORE_MARKERS', 'LEGACY_BLOCK_DETECTED'];
let root: string;
beforeEach(async () => { root = await createLightProject('cb-doctor-snapshot-'); });
afterEach(async () => { await removeProject(root); });

async function doctor(): Promise<DoctorReport> {
  return JSON.parse((await runCli(root, ['doctor', '--json'])).stdout) as DoctorReport;
}
function codes(report: DoctorReport): string[] {
  return report.findings.map((finding) => finding.code);
}

describe('doctor snapshot report (prd-12 FR-09, TC-13)', () => {
  it('reports zone headers only and no removed finding, even with old support files in the project', async () => {
    await runCli(root, [...LIGHT_INIT]);
    await writeFile(join(root, 'task_plan.json'), '{not json', 'utf8');
    await writeFile(join(root, 'AGENTS.md'), '<!-- CONTEXTBRAKE:START -->\nold\n<!-- CONTEXTBRAKE:END -->\n', 'utf8');
    await writeFile(join(root, '.gitignore'), '# CONTEXTBRAKE:START\n', 'utf8');
    const report = await doctor();
    expect(report.snapshot).toEqual({ triggerZone: 'RED', command: null, resumeCommand: null });
    expect(codes(report).filter((code) => REMOVED_CODES.includes(code))).toEqual([]);
  });
  it('reports the configured snapshot and resume commands', async () => {
    await runCli(root, [...LIGHT_INIT, '--snapshot-command', '/sdd-snapshot', '--resume-command', '/sdd-resume', '--snapshot-trigger', 'YELLOW']);
    expect((await doctor()).snapshot).toEqual({ triggerZone: 'YELLOW', command: '/sdd-snapshot', resumeCommand: '/sdd-resume' });
  });
});
