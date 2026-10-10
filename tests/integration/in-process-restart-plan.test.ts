import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
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

const HARNESSES = [
  { harness: 'pi', path: PI_RESTART, install: planPiInstall, remove: planPiRemove },
  { harness: 'oh-my-pi', path: OMP_RESTART, install: planOmpInstall, remove: planOmpRemove },
];

describe('in-process restart file planning (prd-14 FR-07, FR-13, NFR-05, DEC-15)', () => {
  it.each(HARNESSES)('$harness plans the restart file only with restart on, and deletes it when restart is turned off or ContextBrake is removed', async ({ path, install, remove }) => {
    expect(restartChanges(await install({ projectRoot: root, autoRestart: true }), path)).toEqual(['create']);
    expect(restartChanges(await install({ projectRoot: root }), path)).toEqual([]);
    expect(restartChanges(await remove({ projectRoot: root }), path)).toEqual([]);
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), 'export default () => {};\n', 'utf8');
    expect(restartChanges(await install({ projectRoot: root, autoRestart: false }), path)).toEqual(['delete']);
    expect(restartChanges(await remove({ projectRoot: root }), path)).toEqual(['delete']);
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
