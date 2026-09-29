import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installReportSchema } from '../../src/core/contracts/diagnostics.js';
import { CONFIG_PATH, PROTOCOL_PATH, readConfig, removeProject, runCli, USER_CLAUDE } from '../helpers/delegated-world.js';
import { changedPaths, createLightProject, jsonReport, PLAIN_INIT, snapshotTree } from '../helpers/light-world.js';

const FULL_INIT = [...PLAIN_INIT, '--no-light'];
const APPLIED = 'LIGHT_MODE_DEFAULT_APPLIED';
const PENDING = 'LIGHT_MODE_DEFAULT_PENDING';
type Report = { findings: { code: string; severity: string; remediation: string }[]; status: string; exitCode: number };
let root: string;
beforeEach(async () => { root = await createLightProject('cb-init-light-default-'); });
afterEach(async () => { await removeProject(root); });

async function seedFullInstall(): Promise<void> {
  expect((await runCli(root, [...FULL_INIT])).code).toBe(0);
  expect((await readConfig(root))['fullMode']).toBe(true);
}
async function seedLegacyFullInstall(): Promise<void> {
  await seedFullInstall();
  await writeFile(join(root, CONFIG_PATH), JSON.stringify({ ...(await readConfig(root)), fullMode: undefined }), 'utf8');
}
async function doctorReport(): Promise<Report> {
  return JSON.parse((await runCli(root, ['doctor', '--json'])).stdout) as Report;
}

describe('a plain init installs light mode (FR-07, DEC-08, TC-11)', () => {
  it('leaves a new repository in light mode with the notice', async () => {
    const run = await runCli(root, [...PLAIN_INIT]);
    expect(run.code).toBe(0);
    expect((await readConfig(root))['lightMode']).toEqual({ triggerZone: 'RED' });
    expect(jsonReport(run).findings.map((finding) => finding.code)).toContain(APPLIED);
    expect(run.stdout + run.stderr).toContain('--no-light');
  });
  it('keeps a recorded full choice and plans no change', async () => {
    await seedFullInstall();
    const before = await snapshotTree(root);
    expect((await runCli(root, [...PLAIN_INIT])).code).toBe(0);
    expect(changedPaths(before, await snapshotTree(root))).toEqual([]);
    expect((await readConfig(root))['fullMode']).toBe(true);
  });
  it('asks for confirmation without --yes and writes nothing', async () => {
    await seedLegacyFullInstall();
    const before = await snapshotTree(root);
    const declined = await runCli(root, ['init']);
    expect(declined.code).toBe(2);
    expect(declined.stdout + declined.stderr).toContain('CONFIRMATION_REQUIRED');
    expect(changedPaths(before, await snapshotTree(root))).toEqual([]);
  });
});

describe('a plain init moves a full installation that never chose (FR-07, DEC-08, TC-11)', () => {
  it('removes the managed files, records light mode, and says how to go back', async () => {
    await seedLegacyFullInstall();
    const run = await runCli(root, [...PLAIN_INIT]);
    expect(run.code).toBe(0);
    const config = await readConfig(root);
    expect(config['lightMode']).toEqual({ triggerZone: 'RED' });
    expect('fullMode' in config).toBe(false);
    expect(jsonReport(run).findings.map((finding) => finding.code)).toContain(APPLIED);
    const after = await snapshotTree(root);
    expect(after[PROTOCOL_PATH]).toBeUndefined();
    expect(after['.gitignore']).toBeUndefined();
    expect(after['CLAUDE.md']).toBe(USER_CLAUDE);
  });
});

describe('doctor before the switch (FR-07, DEC-09, TC-11)', () => {
  it('informs that the next init goes light, without changing the status or the exit code', async () => {
    await seedLegacyFullInstall();
    const report = await doctorReport();
    const pending = report.findings.filter((finding) => finding.code === PENDING);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.severity).toBe('ok');
    expect(pending[0]?.remediation).toContain('--no-light');
    await writeFile(join(root, CONFIG_PATH), JSON.stringify({ ...(await readConfig(root)), fullMode: true }), 'utf8');
    const settled = await doctorReport();
    expect(settled.findings.map((finding) => finding.code)).not.toContain(PENDING);
    expect([settled.status, settled.exitCode]).toEqual([report.status, report.exitCode]);
  });
  it('stops reporting once the choice is recorded', async () => {
    await seedFullInstall();
    expect((await doctorReport()).findings.map((finding) => finding.code)).not.toContain(PENDING);
  });
  it('shows the applied notice in the init report without changing the exit code', async () => {
    const report = installReportSchema.parse(JSON.parse((await runCli(root, [...PLAIN_INIT])).stdout));
    const applied = report.findings.filter((finding) => finding.code === APPLIED);
    expect(applied).toHaveLength(1);
    expect(applied[0]?.severity).toBe('ok');
    expect(report.exitCode).toBe(0);
  });
});
