import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { HandoffStore } from '../contracts/handoff.js';
import type { RuntimeDecision, RuntimeDescriptor, RuntimeEvent, SessionKey } from '../contracts/runtime.js';
import type { RuntimeErrorLog, SessionLedger } from '../contracts/session-ledger.js';
import type { ClaimDeadline, PhaseMark } from '../contracts/hook-phase.js';
import { LedgerUnreadableError } from './failure-policy.js';
import { isDebugModeInEffect } from './debug-mode-merge.js';
import { decideInjection } from './injection-policy.js';
import { endsWithResetSignal, renderResetNotice } from './reset-notice.js';
import { restartMode } from './restart-mode.js';
import { nextTurn, summarizeLedger, type SessionSummary } from './session-counters.js';
import { readZone, type MeasuredUsage, type ZoneReading } from './session-zone.js';
import { renderTelemetryBlock } from './telemetry-block.js';
import { redStartTurn } from './zone-classifier.js';
import { zoneAction } from './zone-guidance.js';
import { handleSessionReset } from './session-reset-handler.js';

export type { MeasuredUsage } from './session-zone.js';
export type RuntimeInput = { readonly measured?: MeasuredUsage | undefined; readonly observedCharacters?: number | undefined; readonly onPhase?: PhaseMark | undefined; readonly deadline?: ClaimDeadline | undefined };
export type BrakeEngineOptions = { readonly descriptor: RuntimeDescriptor; readonly config: ContextBrakeConfig; readonly ledger: SessionLedger; readonly errors?: RuntimeErrorLog | undefined; readonly handoff?: HandoffStore | undefined };
export interface BrakeEngine { handle(event: RuntimeEvent, input?: RuntimeInput): Promise<RuntimeDecision>; }

const NEUTRAL: RuntimeDecision = { kind: 'neutral' };
export function createBrakeEngine(options: BrakeEngineOptions): BrakeEngine { return { handle: (event, input) => handleEvent(options, event, input ?? {}) }; }
async function handleEvent(options: BrakeEngineOptions, event: RuntimeEvent, input: RuntimeInput): Promise<RuntimeDecision> {
  switch (event.kind) {
    case 'post_tool': return handlePostTool(options, event, input);
    case 'pre_invocation': return handlePreInvocation(options, event, input);
    case 'session_reset': return handleSessionReset(options, event, input);
    case 'response_end': return handleResponseEnd(options, event);
  }
}
async function handlePostTool(options: BrakeEngineOptions, event: RuntimeEvent & { kind: 'post_tool' }, input: RuntimeInput): Promise<RuntimeDecision> {
  const summary = await readSummary(options.ledger, event.session);
  if (event.toolUseId !== null && summary.toolUseIds.has(event.toolUseId)) return NEUTRAL;
  const observedCharacters = input.observedCharacters ?? 0;
  const turn = nextTurn(summary);
  const view = readZone(options, { summary, turns: turn, observedCharacters, measured: input.measured });
  const { reading, zone } = view;
  await ensureSessionLine(options, event.session, summary);
  await options.ledger.appendToolLine(event.session, { toolUseId: event.toolUseId, observedCharacters, turn, usedTokens: reading.usedTokens ?? 0, windowTokens: reading.windowTokens, estimatedTokens: view.estimate, source: reading.source, zone, windowOrigin: reading.windowOrigin });
  return telemetryDecision(options, turn, view);
}
async function handlePreInvocation(options: BrakeEngineOptions, event: RuntimeEvent & { kind: 'pre_invocation' }, input: RuntimeInput): Promise<RuntimeDecision> {
  const summary = await readSummary(options.ledger, event.session);
  return telemetryDecision(options, summary.turns, readZone(options, { summary, turns: summary.turns, observedCharacters: 0, measured: input.measured }));
}
async function telemetryDecision(options: BrakeEngineOptions, turn: number, view: ZoneReading): Promise<RuntimeDecision> {
  if (!decideInjection({ telemetry: options.config.telemetry, zone: view.zone, usagePercentage: view.percentage, debug: isDebugModeInEffect(options.config) })) return NEUTRAL;
  const action = zoneAction(view.zone, options.config.snapshot, restartMode(options.config));
  return { kind: 'context', block: renderTelemetryBlock({ turn, turnCeiling: redStartTurn(options.config.telemetry.zones), usagePercentage: view.percentage, usage: view.reading, zone: view.zone, action, debug: isDebugModeInEffect(options.config) }) };
}
async function handleResponseEnd(options: BrakeEngineOptions, event: RuntimeEvent & { kind: 'response_end' }): Promise<RuntimeDecision> {
  if (options.descriptor.newSessionCommand === null || !endsWithResetSignal(event.text)) return NEUTRAL;
  return { kind: 'notify_user', text: renderResetNotice(options.descriptor.newSessionCommand, restartMode(options.config) !== 'off') };
}
async function ensureSessionLine(options: BrakeEngineOptions, session: SessionKey, summary: SessionSummary): Promise<void> {
  if (summary.sessionLine !== null) return;
  await options.ledger.appendSessionLine(session);
}
async function readSummary(ledger: SessionLedger, session: SessionKey): Promise<SessionSummary> {
  try { return summarizeLedger(await ledger.readLines(session)); } catch (error) { throw new LedgerUnreadableError({ cause: error }); }
}
