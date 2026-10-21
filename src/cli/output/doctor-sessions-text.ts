import type { DoctorReport } from '../../core/contracts/diagnostics.js';
import type { CardRow } from './card.js';
import { formatTokens } from './token-format.js';

type ActiveSession = NonNullable<DoctorReport['activeSessions']>[number];

const MILLISECONDS_PER_MINUTE = 60_000;
const UNKNOWN_SESSION = '(unknown session)';
const UNKNOWN_USAGE = 'usage unknown since last reset';
const JUST_NOW = 'now';
const FIELD_GAP = '  ';

function usageText(usage: ActiveSession['usage']): string {
  if (usage === null) return UNKNOWN_USAGE;
  return [`${usage.percentage}%`, `${formatTokens(usage.usedTokens)} / ${formatTokens(usage.windowTokens)}`, usage.zone, usage.source].join(FIELD_GAP);
}

function activityText(lastActivityAt: string, now: Date): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - Date.parse(lastActivityAt)) / MILLISECONDS_PER_MINUTE));
  return minutes === 0 ? JUST_NOW : `${minutes} min ago`;
}

function sessionRow(session: ActiveSession, now: Date): CardRow {
  return { label: session.sessionId ?? UNKNOWN_SESSION, value: [session.harness, usageText(session.usage), activityText(session.lastActivityAt, now)].join(FIELD_GAP) };
}

export function sessionRows(sessions: DoctorReport['activeSessions'], now: Date): CardRow[] {
  return (sessions ?? []).map((session) => sessionRow(session, now));
}
