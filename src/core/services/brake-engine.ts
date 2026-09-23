import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { HarnessId } from '../contracts/harness.js';
import type { RuntimeDecision, RuntimeDescriptor, RuntimeEvent, SessionKey } from '../contracts/runtime.js';
import type { BlockLog, RuntimeErrorLog, SessionLedger } from '../contracts/session-ledger.js';
import type { UsageReading, Zone } from '../contracts/zones.js';
import type { BootDecision } from './boot-policy.js';
import { isToolCallAllowed } from './brake-allowlist.js';
import { deriveBrakeMode } from './brake-mode.js';
import { renderBlockMessage } from './block-message.js';
import { LedgerUnreadableError } from './failure-policy.js';
import { decideInjection } from './injection-policy.js';
import { hasResetSignal, renderResetNotice } from './reset-notice.js';
import { nextTurn, summarizeLedger, type SessionSummary } from './session-counters.js';
import { renderTelemetryBlock } from './telemetry-block.js';
import { estimatedTokens, resolveUsage } from './usage-resolver.js';
import { classifyZone, usagePercentage } from './zone-classifier.js';

export type ValidationCommandReader = () => Promise<string | null>;
export type BootReader = () => Promise<BootDecision>;
export type MeasuredUsage = { readonly tokens: number | null; readonly contextWindow: number };
export type RuntimeInput = { readonly measured?: MeasuredUsage | undefined; readonly observedCharacters?: number | undefined };
export type BrakeEngineOptions = { readonly descriptor: RuntimeDescriptor; readonly config: ContextBrakeConfig; readonly ledger: SessionLedger; readonly blocks: BlockLog; readonly readValidationCommand: ValidationCommandReader; readonly readBoot?: BootReader | undefined; readonly errors?: RuntimeErrorLog | undefined };
export interface BrakeEngine { handle(event: RuntimeEvent, input?: RuntimeInput): Promise<RuntimeDecision>; }

const NEUTRAL: RuntimeDecision = { kind: 'neutral' };
const COMPACTION_BOOT_HARNESSES: readonly HarnessId[] = ['claude-code', 'codex-cli', 'pi', 'oh-my-pi'];
export function createBrakeEngine(options: BrakeEngineOptions): BrakeEngine { return { handle: (event, input) => handleEvent(options, event, input ?? {}) }; }
async function handleEvent(options: BrakeEngineOptions, event: RuntimeEvent, input: RuntimeInput): Promise<RuntimeDecision> {
  switch (event.kind) {
    case 'pre_tool': return handlePreTool(options, event, input);
    case 'post_tool': return handlePostTool(options, event, input);
    case 'pre_invocation': return handlePreInvocation(options, event, input);
    case 'session_reset': return handleSessionReset(options, event);
    case 'response_end': return handleResponseEnd(options, event);
  }
}
type ZoneReading = { readonly reading: UsageReading; readonly estimate: number; readonly percentage: number; readonly zone: Zone };
type ZoneInputs = { readonly summary: SessionSummary; readonly turns: number; readonly observedCharacters: number; readonly measured?: MeasuredUsage | undefined };
function readZone(options: BrakeEngineOptions, inputs: ZoneInputs): ZoneReading {
  const estimated = { observedCharacters: inputs.summary.observedCharacters + inputs.observedCharacters, turns: inputs.turns };
  const reading = resolveUsage({ estimated, measured: inputs.measured, constants: options.descriptor.estimation, contextWindowCeiling: options.config.telemetry.contextWindowCeiling });
  const percentage = usagePercentage(reading.usedTokens ?? 0, reading.windowTokens);
  return { reading, estimate: estimatedTokens(estimated, options.descriptor.estimation), percentage, zone: classifyZone({ usagePercentage: percentage, turns: inputs.turns }, options.config.telemetry.zones) };
}
async function handlePreTool(options: BrakeEngineOptions, event: RuntimeEvent & { kind: 'pre_tool' }, input: RuntimeInput): Promise<RuntimeDecision> {
  const summary = await readSummary(options.ledger, event.session);
  const { reading, percentage, zone } = readZone(options, { summary, turns: summary.turns, observedCharacters: 0, measured: input.measured });
  if (zone !== 'CRITICAL') return NEUTRAL;
  const validationCommand = event.tool.category === 'shell' ? await options.readValidationCommand() : null;
  if (isToolCallAllowed(event.tool, { config: options.config, validationCommand })) return NEUTRAL;
  await options.blocks.append(event.session, { tool: event.tool.name, zone: 'CRITICAL', turn: summary.turns, percentage, source: reading.source, reason: 'critical_ceiling' });
  return { kind: 'deny', tool: event.tool.name, reason: 'critical_ceiling', message: renderBlockMessage({ tool: event.tool.name, turn: summary.turns, usagePercentage: percentage, usage: reading, config: options.config }) };
}
async function handlePostTool(options: BrakeEngineOptions, event: RuntimeEvent & { kind: 'post_tool' }, input: RuntimeInput): Promise<RuntimeDecision> {
  const summary = await readSummary(options.ledger, event.session);
  if (event.toolUseId !== null && summary.toolUseIds.has(event.toolUseId)) return NEUTRAL;
  const observedCharacters = input.observedCharacters ?? 0;
  const turn = nextTurn(summary);
  const { reading, estimate, percentage, zone } = readZone(options, { summary, turns: turn, observedCharacters, measured: input.measured });
  await ensureSessionLine(options, event.session, summary);
  await options.ledger.appendToolLine(event.session, { toolUseId: event.toolUseId, observedCharacters, turn, usedTokens: reading.usedTokens ?? 0, windowTokens: reading.windowTokens, estimatedTokens: estimate, source: reading.source, zone });
  if (!decideInjection({ telemetry: options.config.telemetry, zone, usagePercentage: percentage })) return NEUTRAL;
  return { kind: 'context', block: renderTelemetryBlock({ turn, turnCeiling: options.config.telemetry.turnCeiling, usagePercentage: percentage, usage: reading, zone }) };
}
async function handlePreInvocation(options: BrakeEngineOptions, event: RuntimeEvent & { kind: 'pre_invocation' }, input: RuntimeInput): Promise<RuntimeDecision> {
  const summary = await readSummary(options.ledger, event.session);
  const { reading, percentage, zone } = readZone(options, { summary, turns: summary.turns, observedCharacters: 0, measured: input.measured });
  if (!decideInjection({ telemetry: options.config.telemetry, zone, usagePercentage: percentage })) return NEUTRAL;
  return { kind: 'context', block: renderTelemetryBlock({ turn: summary.turns, turnCeiling: options.config.telemetry.turnCeiling, usagePercentage: percentage, usage: reading, zone }) };
}
async function handleSessionReset(options: BrakeEngineOptions, event: RuntimeEvent & { kind: 'session_reset' }): Promise<RuntimeDecision> {
  await options.ledger.appendResetLine(event.session, event.reason);
  if (event.reason === 'new') await options.ledger.pruneStaleSessions();
  if (!options.descriptor.capabilities.some((entry) => entry.id === 'session_boot' && entry.state === 'supported')) return NEUTRAL;
  if (event.reason === 'compact' && !COMPACTION_BOOT_HARNESSES.includes(options.descriptor.harness)) return NEUTRAL;
  if (!options.readBoot) return NEUTRAL;
  try {
    const decision = await options.readBoot();
    return decision.kind === 'boot' || decision.kind === 'invalid_state' ? { kind: 'context', block: decision.text } : NEUTRAL;
  } catch (error) {
    if (options.errors) await options.errors.append(options.descriptor.harness, { event: 'session_reset', code: 'UNEXPECTED', detail: error instanceof Error ? error.message : String(error) }).catch(() => undefined);
    return NEUTRAL;
  }
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
async function readSummary(ledger: SessionLedger, session: SessionKey): Promise<SessionSummary> {
  try { return summarizeLedger(await ledger.readLines(session)); } catch (error) { throw new LedgerUnreadableError({ cause: error }); }
}
