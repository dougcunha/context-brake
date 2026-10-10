import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DoctorReport } from '../../src/core/contracts/diagnostics.js';
import { removeProject, runCli } from '../helpers/delegated-world.js';
import { createLightProject, LIGHT_INIT } from '../helpers/light-world.js';
import { FAKE_P95_MILLISECONDS, FAKE_SAMPLE_COUNT } from '../helpers/fake-overhead-measurer.js';

const SNAPSHOT_FLAGS = ['--snapshot-command', '/sdd-snapshot', '--resume-command', '/sdd-resume', '--snapshot-trigger', 'YELLOW'];
let root: string;
beforeEach(async () => { root = await createLightProject('cb-doctor-snapshot-'); });
afterEach(async () => { await removeProject(root); });

describe('doctor --json after a snapshot install (prd-12 FR-09, TC-13; prd-13 DEC-02, TC-09)', () => {
  it('reports the configured snapshot and the injected overhead measurement instead of sampling hook processes', async () => {
    await runCli(root, [...LIGHT_INIT, ...SNAPSHOT_FLAGS]);
    const report = JSON.parse((await runCli(root, ['doctor', '--json'])).stdout) as DoctorReport;
    expect(report.snapshot).toEqual({ triggerZone: 'YELLOW', command: '/sdd-snapshot', resumeCommand: '/sdd-resume' });
    expect(report.integrations.map((integration) => integration.overhead)).toEqual([expect.objectContaining({ harness: 'claude-code', sampleCount: FAKE_SAMPLE_COUNT, p95Milliseconds: FAKE_P95_MILLISECONDS, status: 'pass' })]);
  });
});
