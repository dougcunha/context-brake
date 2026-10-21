import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { doctorReportSchema } from '../../src/core/contracts/diagnostics.js';
import { removeProject, runCli } from '../helpers/delegated-world.js';
import { createLightProject, LIGHT_INIT } from '../helpers/light-world.js';

let root: string;
beforeEach(async () => {
  root = await createLightProject('cb-doctor-verbose-');
  await runCli(root, [...LIGHT_INIT]);
});
afterEach(async () => { await removeProject(root); });

describe('doctor --verbose with --json (FR-12, NFR-01, TC-12)', () => {
  it('gives the same schema-valid document with and without --verbose', async () => {
    const plain = await runCli(root, ['doctor', '--json']);
    const verbose = await runCli(root, ['doctor', '--json', '--verbose']);
    expect(verbose.code).toBe(plain.code);
    expect(doctorReportSchema.parse(JSON.parse(verbose.stdout))).toEqual(doctorReportSchema.parse(JSON.parse(plain.stdout)));
  });
});
