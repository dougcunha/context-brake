import type { RunningHarnessSession } from '../contracts/run-ports.js';
import type { ActiveSession, SessionEndReason, TokenCount } from '../contracts/run-records.js';
import type { Zone } from '../contracts/zones.js';
import { RUN_ID_ENVIRONMENT_VARIABLE, waitOrFinish, type RunContext } from './run-context.js';
import { sessionDeadline, type SessionDeadline } from './run-limits.js';
import { SessionWatch, type WatchEnd } from './session-watch.js';

export type SessionPlanRequest = {
  readonly prompt: string;
  readonly runStartedAt: Date;
  readonly priorTokens: number;
  readonly onStarted: (session: ActiveSession) => Promise<void>;
};
export type SessionOutcome = {
  readonly endReason: SessionEndReason;
  readonly streamParseErrors: number;
  readonly sessionId: string | null;
  readonly startedAt: Date;
  readonly endedAt: Date;
  readonly tokens: TokenCount;
  readonly finalZone: Zone | null;
  readonly harnessDetail: string | null;
};

export async function runSession(context: RunContext, request: SessionPlanRequest): Promise<SessionOutcome> {
  const { deps, settings } = context;
  const startedAt = deps.clock.now();
  const startedWrites: Promise<void>[] = [];
  const watch = new SessionWatch(context, (sessionId) => { startedWrites.push(request.onStarted({ harness: deps.launcher.harness, sessionId, agentId: null })); });
  const running = deps.sessions.start({
    command: deps.launcher.buildCommand({ prompt: request.prompt, harnessArgs: settings.harnessArgs }),
    environment: { [RUN_ID_ENVIRONMENT_VARIABLE]: settings.runId },
    parseLine: (line) => deps.launcher.parseLine(line),
    onEvent: (event) => watch.handle(event),
  });
  const deadline = sessionDeadline({ runStartedAt: request.runStartedAt, sessionStartedAt: startedAt }, settings.limits);
  const end = await superviseSession({ context, running, watch }, deadline, request.priorTokens);
  await watch.close();
  await Promise.all(startedWrites);
  return { endReason: watch.endReason(end), streamParseErrors: end.exit.unparsedLines, sessionId: watch.currentSessionId(), startedAt, endedAt: deps.clock.now(), tokens: watch.tokens(), finalZone: watch.finalZone(), harnessDetail: watch.harnessDetail() };
}

type Supervision = { readonly context: RunContext; readonly running: RunningHarnessSession; readonly watch: SessionWatch };

async function superviseSession(supervision: Supervision, deadline: SessionDeadline, priorTokens: number): Promise<WatchEnd> {
  for (;;) {
    const forced = supervision.watch.forcedEnd(deadline, priorTokens);
    if (forced !== null) {
      await supervision.running.stop();
      return { forced, exit: await supervision.running.exit };
    }
    const result = await waitOrFinish(supervision.context, supervision.running.exit);
    if (result.done) return { forced: null, exit: result.value };
  }
}
