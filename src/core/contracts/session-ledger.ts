import { z } from 'zod/mini';
import { HARNESS_IDS, type HarnessId } from './harness.js';
import type { BrakeMode, SessionKey } from './runtime.js';
import { USAGE_SOURCES, ZONES, type UsageSource, type Zone } from './zones.js';

export const SESSION_RETENTION_DAYS = 14;
export const RESET_REASONS = ['new', 'clear', 'compact'] as const;
export const BLOCK_REASONS = ['critical_ceiling', 'integration_failure'] as const;
export const RUNTIME_ERROR_CODES = ['INVALID_CONFIG', 'PAYLOAD_INVALID', 'DEADLINE_EXCEEDED', 'LEDGER_UNREADABLE', 'UNEXPECTED'] as const;
export const SESSION_BRAKE_MODES = ['enforced', 'cooperative'] as const satisfies readonly BrakeMode[];

export type ResetReason = (typeof RESET_REASONS)[number];
export type BlockReason = (typeof BLOCK_REASONS)[number];
export type RuntimeErrorCode = (typeof RUNTIME_ERROR_CODES)[number];
export type SessionBrakeMode = (typeof SESSION_BRAKE_MODES)[number];

const version = z.literal(1);
const timestamp = z.string().check(z.minLength(1));
const sessionIdFields = { harness: z.enum(HARNESS_IDS), sessionId: z.string(), agentId: z.nullable(z.string()) };

export const sessionLineSchema = z.strictObject({ v: version, type: z.literal('session'), at: timestamp, ...sessionIdFields, brakeMode: z.enum(SESSION_BRAKE_MODES), brakeReason: z.nullable(z.string()) });
export const toolLineSchema = z.strictObject({ v: version, type: z.literal('tool'), at: timestamp, toolUseId: z.nullable(z.string()), observedCharacters: z.int().check(z.nonnegative()), turn: z.int().check(z.positive()), usedTokens: z.int().check(z.nonnegative()), windowTokens: z.int().check(z.positive()), estimatedTokens: z.int().check(z.nonnegative()), source: z.enum(USAGE_SOURCES), zone: z.enum(ZONES) });
export const resetLineSchema = z.strictObject({ v: version, type: z.literal('reset'), at: timestamp, reason: z.enum(RESET_REASONS) });
export const blockLineSchema = z.strictObject({ v: version, at: timestamp, ...sessionIdFields, tool: z.string(), zone: z.enum(ZONES), turn: z.int().check(z.nonnegative()), percentage: z.nullable(z.int()), source: z.nullable(z.enum(USAGE_SOURCES)), reason: z.enum(BLOCK_REASONS) });
export const errorLineSchema = z.strictObject({ v: version, at: timestamp, harness: z.enum(HARNESS_IDS), event: z.string(), code: z.enum(RUNTIME_ERROR_CODES), detail: z.string() });
const ledgerLineSchema = z.union([sessionLineSchema, toolLineSchema, resetLineSchema]);

export type SessionLine = z.infer<typeof sessionLineSchema>;
export type ToolLine = z.infer<typeof toolLineSchema>;
export type ResetLine = z.infer<typeof resetLineSchema>;
export type LedgerLine = SessionLine | ToolLine | ResetLine;
export type BlockLine = z.infer<typeof blockLineSchema>;
export type ErrorLine = z.infer<typeof errorLineSchema>;

export type SessionLineInput = { readonly brakeMode: SessionBrakeMode; readonly brakeReason: string | null };
export type ToolLineInput = { readonly toolUseId: string | null; readonly observedCharacters: number; readonly turn: number; readonly usedTokens: number; readonly windowTokens: number; readonly estimatedTokens: number; readonly source: UsageSource; readonly zone: Zone };
export type BlockRecordInput = { readonly tool: string; readonly zone: Zone; readonly turn: number; readonly percentage: number | null; readonly source: UsageSource | null; readonly reason: BlockReason };
export type ErrorRecordInput = { readonly event: string; readonly code: RuntimeErrorCode; readonly detail: string };

export interface Clock {
  now(): Date;
}
export interface SessionLedger {
  readLines(key: SessionKey): Promise<readonly LedgerLine[]>;
  appendSessionLine(key: SessionKey, input: SessionLineInput): Promise<void>;
  appendToolLine(key: SessionKey, input: ToolLineInput): Promise<void>;
  appendResetLine(key: SessionKey, reason: ResetReason): Promise<void>;
  pruneStaleSessions(): Promise<number>;
}
export interface BlockLog {
  append(key: SessionKey, input: BlockRecordInput): Promise<void>;
}
export interface RuntimeErrorLog {
  append(harness: HarnessId, input: ErrorRecordInput): Promise<void>;
}
export type SessionLedgerEntry = { readonly key: string; readonly lines: readonly LedgerLine[] };
export interface SessionLedgerReader {
  listSessions(harness: HarnessId): Promise<readonly SessionLedgerEntry[]>;
}

export function parseLedgerLines(content: string): LedgerLine[] {
  const lines: LedgerLine[] = [];
  for (const text of content.split(/\r?\n/)) {
    const line = parseLedgerLine(text);
    if (line !== null) lines.push(line);
  }
  return lines;
}
function parseLedgerLine(text: string): LedgerLine | null {
  if (text.trim() === '') return null;
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    return null;
  }
  const result = ledgerLineSchema.safeParse(value);
  return result.success ? result.data : null;
}
