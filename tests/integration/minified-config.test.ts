import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AdapterPlan } from '../../src/core/contracts/adapter.js';
import { planAntigravityInstall } from '../../src/infrastructure/harnesses/antigravity-cli/planner.js';
import { planClaudeInstall } from '../../src/infrastructure/harnesses/claude-code/planner.js';
import { planCodexInstall } from '../../src/infrastructure/harnesses/codex-cli/planner.js';
import { planCursorInstall } from '../../src/infrastructure/harnesses/cursor/planner.js';

type Planner = (root: string) => Promise<AdapterPlan>;

const MALFORMED = '{"hooks":';
const PARSE_DETAIL = 'ValueExpected at offset 9; CloseBraceExpected at offset 9';
const PLANNERS: readonly (readonly [string, Planner])[] = [
  ['.claude/settings.json', (root) => planClaudeInstall({ projectRoot: root })],
  ['.codex/hooks.json', planCodexInstall],
  ['.cursor/hooks.json', planCursorInstall],
  ['.agents/hooks.json', planAntigravityInstall],
];
let root = '';

describe('minified JSON config failures (CR-01, RF7)', () => {
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-min-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it.each(PLANNERS)('refuses a malformed minified %s as a conflict and plans no change', async (config, planner) => {
    await mkdir(dirname(join(root, config)), { recursive: true });
    await writeFile(join(root, config), MALFORMED, 'utf8');
    const plan = await planner(root);
    expect(plan.conflicts).toEqual([{ path: config, code: 'INVALID_HARNESS_CONFIG', detail: PARSE_DETAIL }]);
    expect(plan.changes).toEqual([]);
    expect(await readFile(join(root, config), 'utf8')).toBe(MALFORMED);
  });
});
