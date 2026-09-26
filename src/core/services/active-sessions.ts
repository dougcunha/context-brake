import type { DoctorReport } from '../contracts/diagnostics.js';
import type { HarnessId } from '../contracts/harness.js';
import type { LedgerLine } from '../contracts/session-ledger.js';
import { summarizeLedger, type SessionSummary } from './session-counters.js';
import { classifyZone, usagePercentage, type ZoneLimits } from './zone-classifier.js';

export const ACTIVE_SESSION_WINDOW_MINUTES = 30;
export const ACTIVE_SESSION_LIMIT = 10;

export type HarnessLedger = { readonly harness: HarnessId; readonly lines: readonly LedgerLine[] };
export type ActiveSessionsInput = { readonly now: Date; readonly zones: ZoneLimits };
type ActiveSession = NonNullable<DoctorReport['activeSessions']>[number];
type SessionUsage = ActiveSession['usage'];
type DatedSession = { readonly session: ActiveSession; readonly lastActivity: number };

const MILLISECONDS_PER_MINUTE = 60_000;

export function activeSessions(ledgers: readonly HarnessLedger[], input: ActiveSessionsInput): ActiveSession[] {
  const cutoff = input.now.getTime() - ACTIVE_SESSION_WINDOW_MINUTES * MILLISECONDS_PER_MINUTE;
  return ledgers.flatMap((ledger) => datedSession(ledger, input.zones))
    .filter((entry) => entry.lastActivity >= cutoff)
    .sort((a, b) => b.lastActivity - a.lastActivity)
    .slice(0, ACTIVE_SESSION_LIMIT)
    .map((entry) => entry.session);
}
function datedSession(ledger: HarnessLedger, zones: ZoneLimits): DatedSession[] {
  const stamps = ledger.lines.map((line) => Date.parse(line.at)).filter((stamp) => !Number.isNaN(stamp));
  if (stamps.length === 0) return [];
  const lastActivity = Math.max(...stamps);
  const summary = summarizeLedger(ledger.lines);
  const session = { harness: ledger.harness, sessionId: summary.sessionLine?.sessionId ?? null, lastActivityAt: new Date(lastActivity).toISOString(), usage: currentUsage(summary, zones) };
  return [{ session, lastActivity }];
}
function currentUsage(summary: SessionSummary, zones: ZoneLimits): SessionUsage {
  const tool = summary.lastReading;
  const bridge = summary.statusline.usage;
  const windowTokens = summary.statusline.windowTokens ?? tool?.windowTokens ?? null;
  const isBridgeNewer = bridge !== null && windowTokens !== null && (tool === null || Date.parse(bridge.at) > Date.parse(tool.at));
  if (isBridgeNewer) {
    const percentage = usagePercentage(bridge.tokens, windowTokens);
    return { percentage, usedTokens: bridge.tokens, windowTokens, zone: classifyZone({ usagePercentage: percentage, turns: summary.turns }, zones), source: 'measured', at: bridge.at };
  }
  if (tool === null) return null;
  return { percentage: usagePercentage(tool.usedTokens, tool.windowTokens), usedTokens: tool.usedTokens, windowTokens: tool.windowTokens, zone: tool.zone, source: tool.source, at: tool.at };
}
