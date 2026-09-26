import type { LedgerLine } from '../contracts/session-ledger.js';

export type StatuslineUsage = { readonly tokens: number; readonly at: string };
export type StatuslineSummary = { readonly windowTokens: number | null; readonly usage: StatuslineUsage | null };

export function summarizeStatusline(lines: readonly LedgerLine[], resetIndex: number): StatuslineSummary {
  let windowTokens: number | null = null;
  let usage: StatuslineUsage | null = null;
  for (const [position, line] of lines.entries()) {
    if (line.type !== 'statusline') continue;
    if (line.windowTokens !== null) windowTokens = line.windowTokens;
    if (position > resetIndex && line.inputTokens !== null) usage = { tokens: line.inputTokens, at: line.at };
  }
  return { windowTokens, usage };
}
