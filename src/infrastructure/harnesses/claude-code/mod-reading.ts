import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CONTEXT_READING_MAXIMUM_CHARACTERS, contextReadingRelativePath, contextReadingSchema, isReadingSessionId, type ContextReading } from '../../../core/contracts/context-reading.js';
import type { MeasuredUsage } from '../../../core/services/session-zone.js';
import { resolveClaudeProjectRoot } from './project-root.js';
import type { TranscriptUsage } from './transcript-usage.js';

type TokenChoice = { readonly tokens: number | null; readonly at: string | undefined };

export function parseContextReading(text: string): ContextReading | null {
  if (text.length > CONTEXT_READING_MAXIMUM_CHARACTERS) return null;
  try {
    const parsed = contextReadingSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function readContextReading(sessionId: string | undefined): Promise<ContextReading | null> {
  if (!isReadingSessionId(sessionId)) return null;
  const path = resolve(await resolveClaudeProjectRoot(), contextReadingRelativePath('claude-code', sessionId));
  return parseContextReading(await readFile(path, 'utf8').catch(() => ''));
}

function isNotOlder(reading: ContextReading, transcript: TranscriptUsage | null): boolean {
  return transcript === null || Date.parse(reading.at) >= Date.parse(transcript.at);
}

function chooseTokens(transcript: TranscriptUsage | null, reading: ContextReading | null): TokenChoice {
  if (reading !== null && reading.inputTokens !== null && isNotOlder(reading, transcript)) return { tokens: reading.inputTokens, at: reading.at };
  if (transcript === null) return { tokens: null, at: reading?.at };
  return { tokens: transcript.tokens, at: transcript.at };
}

export function freshestMeasured(transcript: TranscriptUsage | null, reading: ContextReading | null): MeasuredUsage | undefined {
  if (transcript === null && reading === null) return undefined;
  const choice = chooseTokens(transcript, reading);
  return { tokens: choice.tokens, contextWindow: reading?.windowTokens ?? null, at: choice.at };
}
