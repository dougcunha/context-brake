import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { planOmpInstall, planOmpRemove } from '../../src/infrastructure/harnesses/oh-my-pi/planner.js';
import { planPiInstall, planPiRemove } from '../../src/infrastructure/harnesses/pi/planner.js';

const PI_RESTART = '.pi/extensions/context-brake-restart.js';
const OMP_RESTART = '.omp/extensions/context-brake-restart.js';

let root: string;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-restart-plan-')); });
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

function restartChanges(plan: { changes: readonly { path: string; kind: string }[] }, path: string): string[] {
  return plan.changes.filter((change) => change.path === path).map((change) => change.kind);
}

describe('in-process restart file planning (prd-14 FR-07, FR-13, NFR-05, DEC-15)', () => {
  it('plans the restart file only with automatic restart on', async () => {
    expect(restartChanges(await planPiInstall({ projectRoot: root, autoRestart: true }), PI_RESTART)).toEqual(['create']);
    expect(restartChanges(await planOmpInstall({ projectRoot: root, autoRestart: true }), OMP_RESTART)).toEqual(['create']);
    expect(restartChanges(await planPiInstall({ projectRoot: root }), PI_RESTART)).toEqual([]);
    expect(restartChanges(await planOmpInstall({ projectRoot: root, autoRestart: false }), OMP_RESTART)).toEqual([]);
  });
  it('deletes an installed restart file when restart is turned off or ContextBrake is removed', async () => {
    await mkdir(join(root, '.pi', 'extensions'), { recursive: true });
    await writeFile(join(root, PI_RESTART), 'export default () => {};\n', 'utf8');
    expect(restartChanges(await planPiInstall({ projectRoot: root, autoRestart: false }), PI_RESTART)).toEqual(['delete']);
    expect(restartChanges(await planPiRemove({ projectRoot: root }), PI_RESTART)).toEqual(['delete']);
    expect(restartChanges(await planOmpRemove({ projectRoot: root }), OMP_RESTART)).toEqual([]);
  });
  it('keeps a restart file the person edited and reports the conflict', async () => {
    await mkdir(join(root, '.pi', 'extensions'), { recursive: true });
    await writeFile(join(root, PI_RESTART), 'edited\n', 'utf8');
    const manifest = { assets: [{ path: PI_RESTART, kind: 'runtime_asset', sha256: '0'.repeat(64) }] } as never;
    const plan = await planPiInstall({ projectRoot: root, autoRestart: false, manifest });
    expect(restartChanges(plan, PI_RESTART)).toEqual([]);
    expect(plan.conflicts.map((conflict) => conflict.code)).toEqual(['MODIFIED_OWNED_ASSET']);
  });
});
