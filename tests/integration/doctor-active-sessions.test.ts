import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DoctorReport } from '../../src/core/contracts/diagnostics.js';
import type { SessionKey } from '../../src/core/contracts/runtime.js';
import type { ToolLineInput } from '../../src/core/contracts/session-ledger.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';
import { removeProject, runCli } from '../helpers/delegated-world.js';
import { createLightProject, LIGHT_INIT } from '../helpers/light-world.js';

const RED_READING: ToolLineInput = { toolUseId: 'toolu_1', observedCharacters: 10, turn: 1, usedTokens: 86000, windowTokens: 128000, estimatedTokens: 86000, source: 'estimated', zone: 'RED' };
let root: string;
beforeEach(async () => {
  root = await createLightProject('cb-doctor-sessions-');
  await runCli(root, [...LIGHT_INIT]);
});
afterEach(async () => { await removeProject(root); });

async function seedReading(sessionId: string, minutesAgo: number): Promise<void> {
  const clock = { now: () => new Date(Date.now() - minutesAgo * 60_000) };
  const ledger = new NodeSessionLedger(root, clock);
  const key: SessionKey = { harness: 'claude-code', sessionId, agentId: null };
  await ledger.appendSessionLine(key);
  await ledger.appendToolLine(key, RED_READING);
}
async function seedReset(sessionId: string): Promise<void> {
  await seedReading(sessionId, 3);
  const ledger = new NodeSessionLedger(root, { now: () => new Date(Date.now() - 60_000) });
  await ledger.appendResetLine({ harness: 'claude-code', sessionId, agentId: null }, 'clear');
}
async function doctorJson(): Promise<DoctorReport> {
  return JSON.parse((await runCli(root, ['doctor', '--json'])).stdout) as DoctorReport;
}

describe('doctor lists active sessions with their usage (TC-17, FR-14, OBJ-05)', () => {
  it('shows only recent sessions, newest first, in JSON and text', async () => {
    await seedReading('old', 45);
    await seedReading('recent', 5);
    await seedReading('latest', 1);
    const report = await doctorJson();
    expect(report.activeSessions?.map((session) => session.sessionId)).toEqual(['latest', 'recent']);
    expect(report.activeSessions?.[0]?.usage).toMatchObject({ percentage: 67, usedTokens: 86000, windowTokens: 128000, zone: 'RED', source: 'estimated' });
    const text = await runCli(root, ['doctor']);
    expect(text.stdout + text.stderr).toMatch(/ {2}- active sessions:\n {4}\* claude-code latest: 67% \(86000\/128000, RED, estimated\), last activity [12] min ago\n/);
  });
  it('reports unknown usage after a reset with no later reading (codereview_01 OI-03)', async () => {
    await seedReset('cleared');
    expect((await doctorJson()).activeSessions).toEqual([expect.objectContaining({ sessionId: 'cleared', usage: null })]);
    const text = await runCli(root, ['doctor']);
    expect(text.stdout + text.stderr).toMatch(/ {4}\* claude-code cleared: usage unknown since last reset, last activity [012] min ago\n/);
  });
  it('adds nothing without recent sessions', async () => {
    await seedReading('old', 45);
    expect('activeSessions' in (await doctorJson())).toBe(false);
    const text = await runCli(root, ['doctor']);
    expect(text.stdout + text.stderr).not.toContain('active sessions');
  });
});
