import type { PlanPresence, ZoneGuidance } from '../contracts/checkpoint-mode.js';
import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { RuntimeDecision, RuntimeDescriptor, RuntimeEvent, SessionKey } from '../contracts/runtime.js';
import type { BlockLog, RuntimeErrorLog, SessionLedger } from '../contracts/session-ledger.js';
import type { Zone } from '../contracts/zones.js';
import type { PhaseMark } from '../contracts/hook-phase.js';
import { deriveBrakeMode } from './brake-mode.js';
import { LedgerUnreadableError } from './failure-policy.js';
import { isDebugModeInEffect } from './debug-mode-merge.js';
import { decideInjection } from './injection-policy.js';
import { hasResetSignal, renderResetNotice } from './reset-notice.js';
import { nextTurn, summarizeLedger, type SessionSummary } from './session-counters.js';
import { readZone, type MeasuredUsage, type ZoneReading } from './session-zone.js';
import { renderTelemetryBlock } from './telemetry-block.js';
import { redStartTurn } from './zone-classifier.js';
import { isTrustedWindow, telemetryAction } from './window-trust.js';
import { resolveGuidance } from './zone-guidance.js';
import { handleSessionReset, type BootReader } from './session-reset-handler.js';

export type ValidationCommandReader = () => Promise<string | null>;
export type { BootReader } from './session-reset-handler.js';
export type { MeasuredUsage } from './session-zone.js';
export type RuntimeInput = { readonly measured?: MeasuredUsage | undefined; readonly observedCharacters?: number | undefined; readonly onPhase?: PhaseMark | undefined };
export type BrakeEngineOptions = { readonly descriptor: RuntimeDescriptor; readonly config: ContextBrakeConfig; readonly ledger: SessionLedger; readonly blocks: BlockLog; readonly readValidationCommand: ValidationCommandReader; readonly readBoot?: BootReader | undefined; readonly errors?: RuntimeErrorLog | undefined; readonly planPresence?: PlanPresence | undefined };
export interface BrakeEngine { handle(event: RuntimeEvent, input?: RuntimeInput): Promise<RuntimeDecision>; }

const NEUTRAL: RuntimeDecision = { kind: 'neutral' };
export function createBrakeEngine(options: BrakeEngineOptions): BrakeEngine { return { handle: (event, input) => handleEvent(options, event, input ?? {}) }; }
async function handleEvent(options: BrakeEngineOptions, event: RuntimeEvent, input: RuntimeInput): Promise<RuntimeDecision> {
  switch (event.kind) {
    case 'pre_tool': return handlePreTool(options, event, input);
    case 'post_tool': return handlePostTool(options, event, input);
    case 'pre_invocation': return handlePreInvocation(options, event, input);
    case 'session_reset': return handleSessionReset(options, event, input.onPhase);
    case 'response_end': return handleResponseEnd(options, event);
  }
}
async function handlePreTool(options: BrakeEngineOptions, event: RuntimeEvent & { kind: 'pre_tool' }, input: RuntimeInput): Promise<RuntimeDecision> {
  if (options.config.lightMode !== undefined) return NEUTRAL;
  const summary = await readSummary(options.ledger, event.session);
  const { reading, percentage, zone } = readZone(options, { summary, turns: summary.turns, observedCharacters: 0, measured: input.measured });
  if (zone !== 'CRITICAL' || !isTrustedWindow(reading.windowOrigin)) return NEUTRAL;
  const guidance = await readGuidance(options);
  if (await guidance.allows(event.tool)) return NEUTRAL;
  await options.blocks.append(event.session, { tool: event.tool.name, zone: 'CRITICAL', turn: summary.turns, percentage, source: reading.source, reason: 'critical_ceiling' });
  return { kind: 'deny', tool: event.tool.name, reason: 'critical_ceiling', message: guidance.denyMessage({ tool: event.tool.name, turn: summary.turns, usagePercentage: percentage, usage: reading }) };
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
  const action = telemetryAction(view.zone, view.reading.windowOrigin, (await readGuidance(options, view.zone)).actionFor(view.zone));
  return { kind: 'context', block: renderTelemetryBlock({ turn, turnCeiling: redStartTurn(options.config.telemetry.zones), usagePercentage: view.percentage, usage: view.reading, zone: view.zone, action, debug: isDebugModeInEffect(options.config) }) };
}
async function handleResponseEnd(options: BrakeEngineOptions, event: RuntimeEvent & { kind: 'response_end' }): Promise<RuntimeDecision> {
  if (options.descriptor.newSessionCommand === null || !hasResetSignal(event.text)) return NEUTRAL;
  return { kind: 'notify_user', text: renderResetNotice(options.descriptor.newSessionCommand) };
}
async function ensureSessionLine(options: BrakeEngineOptions, session: SessionKey, summary: SessionSummary): Promise<void> {
  if (summary.sessionLine !== null) return;
  const brake = deriveBrakeMode(options.descriptor.capabilities);
  await options.ledger.appendSessionLine(session, { brakeMode: brake.mode, brakeReason: brake.reason });
}
function readGuidance(options: BrakeEngineOptions, zone?: Zone): Promise<ZoneGuidance> {
  return resolveGuidance({ config: options.config, planPresence: options.planPresence, readValidationCommand: options.readValidationCommand, zone });
}
async function readSummary(ledger: SessionLedger, session: SessionKey): Promise<SessionSummary> {
  try { return summarizeLedger(await ledger.readLines(session)); } catch (error) { throw new LedgerUnreadableError({ cause: error }); }
}
