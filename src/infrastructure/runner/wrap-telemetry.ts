import { dirname } from 'node:path';
import type { ActiveSession } from '../../core/contracts/run-records.js';
import type { SessionKey, ToolCall } from '../../core/contracts/runtime.js';
import type { Clock, SessionLedger } from '../../core/contracts/session-ledger.js';
import { nextTurn, summarizeLedger } from '../../core/services/session-counters.js';
import { renderSessionTelemetry, type ZoneSettings } from '../../core/services/session-zone.js';
import { composeRuntime, loadRuntimeConfiguration, systemClock } from '../runtime/runtime-composition.js';
import { readRunRecord } from './node-run-store.js';
import { hasPostToolTelemetry, RUNTIME_DESCRIPTORS } from './runtime-descriptors.js';

export const WRAP_TOOL: ToolCall = { name: 'context-brake wrap', category: 'shell', paths: [], command: null };

export type RunnerSession = { readonly projectRoot: string; readonly session: ActiveSession };
export type WrapTelemetryRequest = RunnerSession & { readonly characters: number; readonly clock?: Clock };

export async function findRunnerSession(startDirectory: string, runId: string | undefined): Promise<RunnerSession | null> {
  if (runId === undefined || runId.trim() === '') return null;
  for (let directory = startDirectory; ; directory = dirname(directory)) {
    const record = await readRunRecord(directory, runId.trim());
    if (record !== null) return record.activeSession === null ? null : { projectRoot: directory, session: record.activeSession };
    if (dirname(directory) === directory) return null;
  }
}

export async function renderWrapTelemetry(request: WrapTelemetryRequest): Promise<string> {
  const config = await loadRuntimeConfiguration(request.projectRoot);
  const descriptor = RUNTIME_DESCRIPTORS[request.session.harness];
  const services = composeRuntime({ projectRoot: request.projectRoot, config, descriptor, clock: request.clock ?? systemClock });
  const key: SessionKey = { harness: request.session.harness, sessionId: request.session.sessionId, agentId: null };
  const recorded = !hasPostToolTelemetry(descriptor);
  if (recorded) await services.engine.handle({ kind: 'post_tool', session: key, tool: WRAP_TOOL, toolUseId: null }, { observedCharacters: request.characters });
  return renderBlock({ descriptor, config }, { ledger: services.ledger, key, pendingCharacters: recorded ? null : request.characters });
}

type BlockSource = { readonly ledger: SessionLedger; readonly key: SessionKey; readonly pendingCharacters: number | null };

async function renderBlock(settings: ZoneSettings, source: BlockSource): Promise<string> {
  const summary = summarizeLedger(await source.ledger.readLines(source.key));
  if (source.pendingCharacters === null) return renderSessionTelemetry(settings, { summary, turns: summary.turns, observedCharacters: 0 });
  return renderSessionTelemetry(settings, { summary, turns: nextTurn(summary), observedCharacters: source.pendingCharacters });
}
