import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { HANDOFF_OFFSET_MS, writeHandoffAt } from '../helpers/handoff-file.js';
import { codesOf, writeConfig, type RestartRun } from '../helpers/in-process-restart-run.js';
import { openOmpRun } from '../helpers/omp-restart-world.js';
import { openPiRun } from '../helpers/pi-restart-world.js';

type Arrange = (root: string, run: RestartRun) => Promise<void>;
type GateRow = { readonly harness: 'oh-my-pi' | 'pi'; readonly gate: string; readonly arrange: Arrange; readonly codes: readonly string[] | null; readonly sessions: number };

const OPEN = { 'oh-my-pi': openOmpRun, pi: openPiRun };
const SWITCHED_OFF = 'stands down with CONTEXT_BRAKE_AUTO_RESTART=0 (DEC-16)';
const MISSING = 'skips without a handoff (FR-04)';
const STALE = 'skips a handoff written before the turn started (FR-04)';
const FRESH = 'restarts with a handoff written during the turn (FR-04, DEC-04)';

async function switchedOff(root: string): Promise<void> {
  await writeConfig(root);
  vi.stubEnv('CONTEXT_BRAKE_AUTO_RESTART', '0');
}

async function nonInteractive(root: string, run: RestartRun): Promise<void> {
  await writeConfig(root);
  run.setMode('print');
}

async function restartOff(root: string): Promise<void> {
  await writeConfig(root, { autoRestart: undefined });
}

function handoffMode(offsetMs: number | null): Arrange {
  return async (root) => {
    await writeConfig(root, { snapshot: DEFAULT_CONFIG.snapshot });
    if (offsetMs !== null) await writeHandoffAt(root, offsetMs);
  };
}

const ROWS: readonly GateRow[] = [
  { harness: 'oh-my-pi', gate: SWITCHED_OFF, arrange: switchedOff, codes: ['SKIP_DISABLED_ENV'], sessions: 0 },
  { harness: 'pi', gate: SWITCHED_OFF, arrange: switchedOff, codes: ['SKIP_DISABLED_ENV'], sessions: 0 },
  { harness: 'pi', gate: 'stands down outside the interactive terminal', arrange: nonInteractive, codes: ['SKIP_NON_INTERACTIVE'], sessions: 0 },
  { harness: 'pi', gate: 'writes nothing with automatic restart off (NFR-05)', arrange: restartOff, codes: null, sessions: 0 },
  { harness: 'oh-my-pi', gate: MISSING, arrange: handoffMode(null), codes: ['SKIP_HANDOFF_MISSING'], sessions: 0 },
  { harness: 'pi', gate: MISSING, arrange: handoffMode(null), codes: ['SKIP_HANDOFF_MISSING'], sessions: 0 },
  { harness: 'oh-my-pi', gate: STALE, arrange: handoffMode(-HANDOFF_OFFSET_MS), codes: ['SKIP_HANDOFF_STALE'], sessions: 0 },
  { harness: 'pi', gate: STALE, arrange: handoffMode(-HANDOFF_OFFSET_MS), codes: ['SKIP_HANDOFF_STALE'], sessions: 0 },
  { harness: 'oh-my-pi', gate: FRESH, arrange: handoffMode(HANDOFF_OFFSET_MS), codes: ['RESTARTED'], sessions: 1 },
  { harness: 'pi', gate: FRESH, arrange: handoffMode(HANDOFF_OFFSET_MS), codes: ['RESTARTED'], sessions: 1 },
];

let root: string;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-in-process-gates-')); });
afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

describe('in-process restart gates on Pi and Oh-My-Pi (prd-14 FR-04, FR-09, DEC-04, DEC-16, DEC-19, TC-09, TC-10)', () => {
  it.each(ROWS)('$harness $gate', async ({ harness, arrange, codes, sessions }) => {
    const run = OPEN[harness](root);
    await arrange(root, run);
    await run.start();
    await run.signal();
    expect(await codesOf(run)).toEqual(codes);
    expect(run.sessions()).toBe(sessions);
  });
});
