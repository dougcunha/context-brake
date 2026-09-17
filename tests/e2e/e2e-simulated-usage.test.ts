import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { LedgerLine, ToolLine } from '../../src/core/contracts/session-ledger.js';
import { writeRuntimeConfig } from '../helpers/runtime-seed.js';
import { usageSteps } from '../support/harness-simulator/agent-profiles.js';
import { IN_PROCESS_HARNESSES, createInProcessSession, type InProcessHarnessId } from '../support/harness-simulator/in-process-driver.js';
import { createProcessSession, installHarness } from '../support/harness-simulator/process-driver.js';
import { SessionRecorder, readLedgerLines, runScript } from '../support/harness-simulator/session-recorder.js';
import { OUTPUT_KINDS, PLAN_FILE, SIMULATED_WINDOWS, planContent, type OutputKind, type SimulatedWindow } from '../support/harness-simulator/scenarios.js';

const USAGE_TURNS = 12;
const OUTPUT_CHARACTERS = 5000;
const MAXIMUM_MARGIN_POINTS = 10;
const SESSION_TIMEOUT_MS = 60000;
const PROCESS_SESSION_ID = 'usage-process-claude';

function percentage(tokens: number, window: number): number {
  return Math.floor((tokens * 100) / window);
}
function toolLines(lines: readonly LedgerLine[]): readonly ToolLine[] {
  return lines.filter((line): line is ToolLine => line.type === 'tool');
}
async function createFixture(window: SimulatedWindow): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'cb-t09-usage-'));
  await writeRuntimeConfig(root, window);
  await mkdir(join(root, 'src'), { recursive: true });
  await writeFile(join(root, 'src/app.ts'), 'export const app = true;\n', 'utf8');
  await writeFile(join(root, PLAN_FILE), planContent(), 'utf8');
  return root;
}
type MeasuredInput = { readonly root: string; readonly harness: InProcessHarnessId; readonly window: SimulatedWindow; readonly kind: OutputKind };
async function driveMeasured(input: MeasuredInput): Promise<readonly number[]> {
  const channel = await createInProcessSession({ root: input.root, harness: input.harness, sessionId: `usage-${input.harness}-${input.kind}-${input.window}`, window: input.window, kind: input.kind, seedCharacters: 0 });
  const recorder = new SessionRecorder();
  await runScript({ channel, harness: input.harness, recorder, root: input.root }, usageSteps({ kind: input.kind, turns: USAGE_TURNS, characters: OUTPUT_CHARACTERS }));
  expect(recorder.records).toHaveLength(USAGE_TURNS);
  expect(recorder.records.every((record) => record.outcome === 'executed')).toBe(true);
  const lines = toolLines(await readLedgerLines(input.root, { harness: input.harness, sessionId: channel.sessionId, agentId: null }));
  expect(lines).toHaveLength(USAGE_TURNS);
  expect(JSON.stringify(lines)).not.toContain('content');
  return lines.map((line) => {
    expect(line.source).toBe('measured');
    expect(line.windowTokens).toBe(input.window);
    return Math.abs(percentage(line.estimatedTokens, input.window) - percentage(line.usedTokens, input.window));
  });
}
async function driveEstimated(root: string): Promise<string> {
  await installHarness(root, 'claude-code');
  const session = createProcessSession({ root, harness: 'claude-code', sessionId: PROCESS_SESSION_ID });
  const recorder = new SessionRecorder();
  await runScript({ channel: session, harness: 'claude-code', recorder, root }, usageSteps({ kind: 'code', turns: USAGE_TURNS, characters: 800 }));
  const lines = toolLines(await readLedgerLines(root, { harness: 'claude-code', sessionId: PROCESS_SESSION_ID, agentId: null }));
  expect(lines).toHaveLength(USAGE_TURNS);
  for (const line of lines) {
    expect(line.source).toBe('estimated');
    expect(line.usedTokens).toBe(line.estimatedTokens);
  }
  return JSON.stringify(lines.map((line) => ({ ...line, at: '' })));
}

describe('T09 simulated usage accuracy (TC-13, CA-11)', () => {
  const roots: string[] = [];
  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })));
  });
  for (const harness of IN_PROCESS_HARNESSES) {
    for (const window of SIMULATED_WINDOWS) {
      for (const kind of OUTPUT_KINDS) {
        it(`keeps every ${harness} ${kind} reading within ${MAXIMUM_MARGIN_POINTS} points at window ${window}`, async () => {
          const root = await createFixture(window);
          roots.push(root);
          const margins = await driveMeasured({ root, harness, window, kind });
          expect(Math.max(...margins)).toBeLessThanOrEqual(MAXIMUM_MARGIN_POINTS);
        }, SESSION_TIMEOUT_MS);
      }
    }
  }
});

describe('T09 simulated process harness (CA-11 acceptance)', () => {
  it('drives the installed Claude Code hook with estimated readings and identical repeated ledgers', async () => {
    const firstRoot = await createFixture(SIMULATED_WINDOWS[0]);
    const secondRoot = await createFixture(SIMULATED_WINDOWS[0]);
    try {
      expect(await driveEstimated(firstRoot)).toBe(await driveEstimated(secondRoot));
    } finally {
      await rm(firstRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      await rm(secondRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  }, SESSION_TIMEOUT_MS * 4);
});

