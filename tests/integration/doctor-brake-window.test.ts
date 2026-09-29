import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { doctorReportSchema } from '../../src/core/contracts/diagnostics.js';
import { createStatuslineWorld, removeStatuslineWorld, runJson, type StatuslineWorld } from '../helpers/statusline-world.js';

let world: StatuslineWorld;
beforeEach(async () => { world = await createStatuslineWorld(); });
afterEach(async () => { await removeStatuslineWorld(world); });

async function doctor() {
  return doctorReportSchema.parse(await runJson(world, ['doctor', '--json']));
}

describe('doctor brake window for Claude Code (prd-09 FR-07, DEC-10, TC-11)', () => {
  it('reports that the brake can block with the default bridge and raises no bridge warning', async () => {
    await runJson(world, ['init', '--yes', '--json', '--no-light']);
    const report = await doctor();
    expect(report.brakeWindow).toEqual([{ harness: 'claude-code', canDeny: true, reason: 'bridge' }]);
    expect(report.findings.map((finding) => finding.code)).not.toContain('STATUSLINE_BRIDGE_ABSENT');
  });
  it('warns with a remediation when the bridge was turned off', async () => {
    await runJson(world, ['init', '--yes', '--json', '--no-light', '--no-statusline-bridge']);
    const report = await doctor();
    expect(report.brakeWindow).toEqual([{ harness: 'claude-code', canDeny: false, reason: 'bridge_absent' }]);
    expect(report.findings).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'STATUSLINE_BRIDGE_ABSENT', severity: 'warning' })]));
  });
  it('reports no brake window in the light mode, which is now the default (FR-07, FR-09)', async () => {
    await runJson(world, ['init', '--yes', '--json']);
    const report = await doctor();
    expect(report.brakeWindow).toBeUndefined();
    expect(report.checkpointMode).toMatchObject({ effective: 'light' });
  });
});
