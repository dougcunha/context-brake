import type { DoctorReport } from '../../core/contracts/diagnostics.js';

type ActiveSession = NonNullable<DoctorReport['activeSessions']>[number];

const MILLISECONDS_PER_MINUTE = 60_000;
const UNKNOWN_SESSION = '(unknown session)';

export function renderActiveSessionsText(sessions: DoctorReport['activeSessions'], now: Date): string {
  if (sessions === undefined || sessions.length === 0) return '';
  return ['  - active sessions:\n', ...sessions.map((session) => renderSession(session, now))].join('');
}
function renderSession(session: ActiveSession, now: Date): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - Date.parse(session.lastActivityAt)) / MILLISECONDS_PER_MINUTE));
  const usage = session.usage === null ? 'usage unknown since last reset' : `${session.usage.percentage}% (${session.usage.usedTokens}/${session.usage.windowTokens}, ${session.usage.zone}, ${session.usage.source})`;
  return `    * ${session.harness} ${session.sessionId ?? UNKNOWN_SESSION}: ${usage}, last activity ${minutes} min ago\n`;
}
