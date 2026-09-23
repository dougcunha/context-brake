import { getEncoding } from 'js-tiktoken';
import type { HarnessId } from '../../../src/core/contracts/harness.js';
import type { SessionKey } from '../../../src/core/contracts/runtime.js';
import type { ToolLineInput } from '../../../src/core/contracts/session-ledger.js';
import { NodeSessionLedger } from '../../../src/infrastructure/runtime/node-session-ledger.js';
import { fixedClock } from '../../helpers/runtime-seed.js';

export const SIMULATED_WINDOWS = [128000, 200000] as const;
export type SimulatedWindow = (typeof SIMULATED_WINDOWS)[number];
export const OUTPUT_KINDS = ['code', 'json', 'log', 'prose'] as const;
export type OutputKind = (typeof OUTPUT_KINDS)[number];
export const BASELINE_TOKENS = 15000;
export const TOKENS_PER_TURN = 150;
export const SEEDED_TURNS = 11;
export const RED_USAGE_TARGET = 0.7;
export const PLAN_FILE = 'task_plan.json';
export const CHECKPOINT_FILE = 'state_checkpoint.json';
export const WORK_FILE = 'src/feature.ts';
export const VALIDATION_COMMAND = 'node --version';
export type SimulatedOutput = { readonly kind: OutputKind; readonly characters: number };
export type SimulatedCall =
  | { readonly id: string; readonly tool: 'read' | 'write'; readonly path: string; readonly content: string; readonly output: SimulatedOutput }
  | { readonly id: string; readonly tool: 'shell'; readonly command: string; readonly executable: string; readonly argv: readonly string[]; readonly output: SimulatedOutput };

const encoding = getEncoding('o200k_base');
const ASSISTANT_SOURCE = 'I inspected the requested files, recorded what changed, and I will continue with the next step of the current plan once the tool reports back. ';
const BASELINE_SOURCE = 'ContextBrake simulator baseline. The following instructions describe the repository layout, the validation workflow, and the review conventions that the simulated session follows while it works through the plan. ';

function codeSource(): string {
  return Array.from({ length: 12 }, (_, i) => `export function processRecord${i}(input: RecordInput${i}): RecordResult${i} {\n  const normalized = normalizeRecord(input);\n  if (normalized.items.length === 0) return { status: 'empty', items: [] };\n  return { status: 'ok', items: normalized.items.map((item) => computeScore(item, ${i + 1})) };\n}`).join('\n\n');
}
function jsonSource(): string {
  return JSON.stringify(Array.from({ length: 24 }, (_, i) => ({ id: i, name: `artifact-${i}`, status: 'completed', summary: 'The worker processed the batch and persisted the aggregated counters for the dashboard view.', path: `src/modules/feature-${i}.ts`, tags: ['build', 'telemetry'] })), null, 2);
}
function logSource(): string {
  return Array.from({ length: 40 }, (_, i) => `2026-09-16T12:00:${String(i % 60).padStart(2, '0')}.000Z INFO worker-${i % 4} processed batch ${i} and persisted the aggregated counters in ${120 + i} milliseconds while the queue depth stayed at ${30 - (i % 30)} entries`).join('\n');
}
function proseSource(): string {
  return Array.from({ length: 24 }, (_, i) => `The worker ${i} processed the incoming batch and persisted the aggregated counters before the next scheduled validation ran, so the dashboard view stayed consistent with the telemetry that the harness reported during the session.`).join(' ');
}
const CORPUS_SOURCES: Record<OutputKind, string> = { code: codeSource(), json: jsonSource(), log: logSource(), prose: proseSource() };

export function measureTokens(text: string): number {
  return encoding.encode(text).length;
}
export function takeTokens(text: string, count: number): string {
  const encoded = encoding.encode(text);
  return encoded.length <= count ? text : encoding.decode(encoded.slice(0, count));
}
export function readCall(id: string, path: string): SimulatedCall {
  return { id, tool: 'read', path, content: '', output: { kind: 'code', characters: 240 } };
}
export function writeCall(id: string, path: string, content: string): SimulatedCall {
  return { id, tool: 'write', path, content, output: { kind: 'code', characters: 240 } };
}
export function shellCall(id: string, command: string, argv: readonly string[]): SimulatedCall {
  return { id, tool: 'shell', command, argv, executable: 'git', output: { kind: 'log', characters: 320 } };
}
export function nodeCall(id: string, command: string): SimulatedCall {
  return { id, tool: 'shell', command, argv: ['--version'], executable: process.execPath, output: { kind: 'log', characters: 120 } };
}
export function corpusText(output: SimulatedOutput, variant: number): string {
  const text = CORPUS_SOURCES[output.kind];
  const offset = (variant * 977) % text.length;
  const rotated = `${text.slice(offset)}${text.slice(0, offset)}`;
  return rotated.repeat(Math.ceil(output.characters / rotated.length)).slice(0, output.characters);
}
export function baselinePrompt(): string {
  return takeTokens(BASELINE_SOURCE.repeat(400), BASELINE_TOKENS);
}
export function assistantText(): string {
  return takeTokens(ASSISTANT_SOURCE.repeat(8), TOKENS_PER_TURN);
}
export function checkpointContent(): string {
  return `${JSON.stringify({ schemaVersion: 1, taskId: 'task-1', activeStepId: 1, gitState: { branch: 'master', lastCommitHash: null, cleanWorkingTree: true }, workingMemory: { discoveredConstraints: [], decisionsMade: [], blockedItems: [], breakingChanges: [] }, modifiedFiles: [], timestamp: '2026-09-16T12:00:00.000Z' }, null, 2)}\n`;
}
export function planContent(): string {
  const step = { id: 1, title: 'Step 1', status: 'IN_PROGRESS', validationCommand: VALIDATION_COMMAND, artifactsProduced: [], description: '' };
  return `${JSON.stringify({ schemaVersion: 1, taskId: 'task-1', title: 'Task 1', currentStepId: 1, steps: [step] }, null, 2)}\n`;
}
export function seedCharactersFor(window: SimulatedWindow): number {
  const target = Math.floor(window * RED_USAGE_TARGET);
  return Math.floor((4 * (target - BASELINE_TOKENS - SEEDED_TURNS * TOKENS_PER_TURN)) / SEEDED_TURNS) * SEEDED_TURNS;
}
export async function seedRedSession(input: { readonly root: string; readonly harness: HarnessId; readonly window: SimulatedWindow; readonly sessionId: string }): Promise<void> {
  const ledger = new NodeSessionLedger(input.root, fixedClock);
  const key: SessionKey = { harness: input.harness, sessionId: input.sessionId, agentId: null };
  await ledger.appendSessionLine(key, { brakeMode: 'enforced', brakeReason: null });
  const perTurn = Math.floor(seedCharactersFor(input.window) / SEEDED_TURNS);
  for (let turn = 1; turn <= SEEDED_TURNS; turn += 1) await ledger.appendToolLine(key, seedLine(turn, perTurn, input.window));
}
function seedLine(turn: number, perTurn: number, window: SimulatedWindow): ToolLineInput {
  const used = BASELINE_TOKENS + Math.ceil((perTurn * turn) / 4) + turn * TOKENS_PER_TURN;
  return { toolUseId: `seed-${turn}`, observedCharacters: perTurn, turn, usedTokens: used, windowTokens: window, estimatedTokens: used, source: 'estimated', zone: 'RED' };
}
