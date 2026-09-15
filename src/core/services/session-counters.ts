import type { LedgerLine, SessionLine, ToolLine } from '../contracts/session-ledger.js';
import type { Zone } from '../contracts/zones.js';

export type SessionSummary = {
  readonly turns: number;
  readonly observedCharacters: number;
  readonly lastReading: ToolLine | null;
  readonly lastZone: Zone | null;
  readonly sessionLine: SessionLine | null;
  readonly toolUseIds: ReadonlySet<string>;
};

export function nextTurn(summary: SessionSummary): number {
  return summary.turns + 1;
}
export function summarizeLedger(lines: readonly LedgerLine[]): SessionSummary {
  const sessionLine = lines.find((line) => line.type === 'session') ?? null;
  const toolUseIds = new Set<string>();
  let turns = 0;
  let observedCharacters = 0;
  let lastReading: ToolLine | null = null;
  for (const line of lines.slice(lastResetIndex(lines) + 1)) {
    if (line.type !== 'tool') continue;
    if (line.toolUseId !== null) {
      if (toolUseIds.has(line.toolUseId)) continue;
      toolUseIds.add(line.toolUseId);
    }
    turns += 1;
    observedCharacters += line.observedCharacters;
    lastReading = line;
  }
  return { turns, observedCharacters, lastReading, lastZone: lastReading?.zone ?? null, sessionLine, toolUseIds };
}
function lastResetIndex(lines: readonly LedgerLine[]): number {
  let index = -1;
  for (const [position, line] of lines.entries()) if (line.type === 'reset') index = position;
  return index;
}
