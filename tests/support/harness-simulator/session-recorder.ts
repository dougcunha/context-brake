import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { SessionKey } from '../../../src/core/contracts/runtime.js';
import type { LedgerLine } from '../../../src/core/contracts/session-ledger.js';
import { NodeSessionLedger } from '../../../src/infrastructure/runtime/node-session-ledger.js';
import { runGit } from '../../helpers/git-capability.js';
import { fixedClock } from '../../helpers/runtime-seed.js';
import type { SessionStep } from './agent-profiles.js';
import { corpusText, type SimulatedCall } from './scenarios.js';

const run = promisify(execFile);
const COMMAND_TIMEOUT_MS = 15000;

export type HookOutcome = { readonly allowed: boolean; readonly response: string };
export type SessionChannel = {
  readonly pre: (step: SessionStep) => Promise<HookOutcome>;
  readonly post: (step: SessionStep, output: string) => Promise<string | null>;
  readonly reset: (kind: 'compact' | 'new') => Promise<void>;
  readonly reload?: (() => Promise<void>) | undefined;
  readonly boot?: ((source?: 'startup' | 'compact') => Promise<string | null>) | undefined;
};
export type CallOutcome = 'executed' | 'denied';
export type CallRecord = {
  readonly harness: string;
  readonly step: SessionStep;
  readonly outcome: CallOutcome;
  readonly response: string;
  readonly block: string | null;
};
export class SessionRecorder {
  private readonly entries: CallRecord[] = [];
  record(entry: CallRecord): void { this.entries.push(entry); }
  get records(): readonly CallRecord[] { return this.entries; }
  find(id: SimulatedCall['id']): CallRecord | undefined { return this.entries.find((entry) => entry.step.call.id === id); }
  report(): string {
    return this.entries.map((entry) => `${entry.harness} ${entry.step.phase} ${entry.step.call.id} expected=${entry.step.expectation} actual=${entry.outcome}`).join('\n');
  }
}
export type ScriptInput = { readonly channel: SessionChannel; readonly harness: string; readonly recorder: SessionRecorder; readonly root: string };
export async function runScript(input: ScriptInput, steps: readonly SessionStep[]): Promise<void> {
  for (const batch of groupParallel(steps)) await Promise.all(batch.map((step, index) => runStep(input, step, index)));
}
async function runStep(input: ScriptInput, step: SessionStep, variant: number): Promise<void> {
  if (step.corruptConfigFirst === true) {
    await corruptConfiguration(input.root);
    await input.channel.reload?.();
  }
  const outcome = await input.channel.pre(step);
  if (!outcome.allowed) {
    input.recorder.record({ harness: input.harness, step, outcome: 'denied', response: outcome.response, block: null });
    return;
  }
  await executeSimulatedCall(input.root, step.call);
  const block = step.skipPost === true ? null : await input.channel.post(step, corpusText(step.call.output, variant));
  input.recorder.record({ harness: input.harness, step, outcome: 'executed', response: outcome.response, block });
  if (step.resetAfter !== undefined) await input.channel.reset(step.resetAfter);
}
function groupParallel(steps: readonly SessionStep[]): readonly (readonly SessionStep[])[] {
  const batches: SessionStep[][] = [];
  for (const step of steps) {
    const last = batches[batches.length - 1];
    if (step.parallel === true && last !== undefined && last[0]?.parallel === true) last.push(step);
    else batches.push([step]);
  }
  return batches;
}
export async function executeSimulatedCall(root: string, call: SimulatedCall): Promise<void> {
  if (call.tool === 'shell') {
    await run(call.executable, [...call.argv], { cwd: root, timeout: COMMAND_TIMEOUT_MS }); return;
  }
  if (call.tool === 'write') {
    await writeFile(join(root, call.path), call.content, 'utf8'); return;
  }
  await readFile(join(root, call.path), 'utf8');
}
export async function corruptConfiguration(root: string): Promise<void> {
  await writeFile(join(root, 'context-brake.config.json'), '{ "schemaVersion": 1, "telemetry": ', 'utf8');
}
export async function initializeRepository(root: string): Promise<void> {
  await runGit(['init'], root);
  await runGit(['config', 'user.email', 'simulator@example.com'], root);
  await runGit(['config', 'user.name', 'ContextBrake Simulator'], root);
  await runGit(['config', 'commit.gpgsign', 'false'], root);
  await runGit(['add', '-A'], root);
  await runGit(['commit', '-m', 'initial'], root);
}
export async function lastCommitSubject(root: string): Promise<string> {
  return (await runGit(['log', '-1', '--format=%s'], root)).trim();
}
export async function readLedgerLines(root: string, key: SessionKey): Promise<readonly LedgerLine[]> {
  return await new NodeSessionLedger(root, fixedClock).readLines(key);
}
