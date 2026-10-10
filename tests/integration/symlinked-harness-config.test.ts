import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { HarnessAdapter } from '../../src/core/contracts/adapter.js';
import type { ChangePlan } from '../../src/core/contracts/changes.js';
import { createChangePlan } from '../../src/core/services/change-plan-service.js';
import { ClaudeAdapter } from '../../src/infrastructure/harnesses/claude-code/adapter.js';
import { CursorAdapter } from '../../src/infrastructure/harnesses/cursor/adapter.js';
import { NodeChangeApplier } from '../../src/infrastructure/storage/change-applier.js';
import { snapshotFiles } from '../../src/infrastructure/storage/node-file-system.js';
import { attemptLink, requireLink } from '../helpers/link-capability.js';

type LinkedHarness = { readonly adapter: HarnessAdapter; readonly link: string; readonly target: string; readonly config: string; readonly assets: readonly string[]; readonly original: string; readonly userEntry: string };

const CLAUDE: LinkedHarness = { adapter: new ClaudeAdapter(), link: '.claude', target: '.agents', config: 'settings.json', assets: ['hooks/context-brake.mjs', 'hooks/context-brake-statusline.mjs'], original: '{\n  "hooks": {\n    "UserHook": "node custom.js"\n  }\n}\n', userEntry: '"UserHook": "node custom.js"' };
const CURSOR: LinkedHarness = { adapter: new CursorAdapter(), link: '.cursor', target: 'real-cursor', config: 'hooks.json', assets: ['hooks/context-brake.mjs'], original: '{\n  "version": 1\n}\n', userEntry: '"version": 1' };

async function planAgainstSnapshots(root: string, harness: LinkedHarness): Promise<ChangePlan> {
  const configPath = `${harness.link}/${harness.config}`;
  const plan = await harness.adapter.planInstall({ projectRoot: root });
  const snapshots = await snapshotFiles(root, [configPath, ...harness.assets.map((asset) => `${harness.link}/${asset}`)]);
  expect(plan.changes.find((c) => c.path === configPath)?.realPath).toBe(snapshots.find((s) => s.path === configPath)?.realPath);
  return createChangePlan({ projectRoot: root, plannedChanges: plan.changes, snapshots });
}

describe('symlinked harness configuration (T10.4, CR-01)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-sym-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true }).catch(() => {}); });

  it.for([['Claude Code', CLAUDE], ['Cursor', CURSOR]] as const)('installs %s through a linked folder, keeps the link and the user entry, and plans nothing on a second run', async ([, harness], ctx) => {
    const configTarget = join(root, harness.target, harness.config);
    await mkdir(join(root, harness.target), { recursive: true });
    await writeFile(configTarget, harness.original, 'utf8');
    await requireLink(ctx, await attemptLink(join(root, harness.target), join(root, harness.link)), join(root, harness.link));
    const report = await new NodeChangeApplier().apply(await planAgainstSnapshots(root, harness));
    expect(report.status).toBe('success');
    expect((await lstat(join(root, harness.link))).isSymbolicLink()).toBe(true);
    expect(await readFile(configTarget, 'utf8')).toContain(harness.userEntry);
    expect((await planAgainstSnapshots(root, harness)).changes).toHaveLength(0);
  });
});
