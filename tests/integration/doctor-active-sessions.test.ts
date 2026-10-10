import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DoctorReport } from '../../src/core/contracts/diagnostics.js';
import type { SessionKey } from '../../src/core/contracts/runtime.js';
import type { ToolLineInput } from '../../src/core/contracts/session-ledger.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';
import { removeProject, runCli } from '../helpers/delegated-world.js';
import { createLightProject, LIGHT_INIT } from '../helpers/light-world.js';

const RED_READING: ToolLineInput = { toolUseId: 'toolu_1', observedCharacters: 10, turn: 1, usedTokens: 86000, windowTokens: 128000, estimatedTokens: 86000, source: 'estimated', zone: 'RED' };
const SESSIONS_TEXT = / {2}- active sessions:\n {4}\* claude-code latest: 67% \(86000\/128000, RED, estimated\), last activity [12] min ago\n {4}\* claude-code cleared: usage unknown since last reset, last activity [23] min ago\n {4}\* claude-code recent: 67% /;
let root: string;
beforeEach(async () => {
  root = await createLightProject('cb-doctor-sessions-');
  await runCli(root, [...LIGHT_INIT]);
});
afterEach(async () => { await removeProject(root); });

function ledgerAt(minutesAgo: number): NodeSessionLedger {
  return new NodeSessionLedger(root, { now: () => new Date(Date.now() - minutesAgo * 60_000) });
}
async function seedReading(sessionId: string, minutesAgo: number): Promise<void> {
  const key: SessionKey = { harness: 'claude-code', sessionId, agentId: null };
  await ledgerAt(minutesAgo).appendSessionLine(key);
  await ledgerAt(minutesAgo).appendToolLine(key, RED_READING);
}
async function seedReset(sessionId: string): Promise<void> {
  await seedReading(sessionId, 3);
  await ledgerAt(2).appendResetLine({ harness: 'claude-code', sessionId, agentId: null }, 'clear');
}
async function doctorJson(): Promise<DoctorReport> {
  return JSON.parse((await runCli(root, ['doctor', '--json'])).stdout) as DoctorReport;
}

describe('doctor lists active sessions with their usage (TC-17, FR-14, OBJ-05, codereview_01 OI-03)', () => {
  it('shows only recent sessions, newest first, with unknown usage after a reset, in JSON and text', async () => {
    await seedReading('old', 45);
    await seedReading('recent', 5);
    await seedReset('cleared');
    await seedReading('latest', 1);
    const report = await doctorJson();
    expect(report.activeSessions?.map((session) => [session.sessionId, session.usage?.zone ?? null])).toEqual([['latest', 'RED'], ['cleared', null], ['recent', 'RED']]);
    expect(report.activeSessions?.[0]?.usage).toMatchObject({ percentage: 67, usedTokens: 86000, windowTokens: 128000, zone: 'RED', source: 'estimated' });
    const text = await runCli(root, ['doctor']);
    expect(text.stdout + text.stderr).toMatch(SESSIONS_TEXT);
  });
  it('adds nothing without recent sessions', async () => {
    await seedReading('old', 45);
    expect('activeSessions' in (await doctorJson())).toBe(false);
    const text = await runCli(root, ['doctor']);
    expect(text.stdout + text.stderr).not.toContain('active sessions');
  });
});
