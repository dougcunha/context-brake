import type { LedgerLine } from '../../../core/contracts/session-ledger.js';
import type { StatuslineLineInput } from '../../../core/contracts/statusline-line.js';
import { usagePercentage } from '../../../core/services/zone-classifier.js';
import type { PreviousFailure } from './statusline-previous.js';

export type FallbackInput = { readonly reason: PreviousFailure; readonly ledger: readonly LedgerLine[]; readonly payload: StatuslineLineInput | null };

const PRODUCT = 'ContextBrake';
const DOCTOR_HINT = 'run context-brake doctor';

export function renderFallbackLine(input: FallbackInput): string {
  return `${[PRODUCT, ...reading(input)].join(' ')} · previous status line failed (${input.reason}) · ${DOCTOR_HINT}\n`;
}

function reading(input: FallbackInput): string[] {
  const newestFirst = [...input.ledger].reverse();
  const resetIndex = newestFirst.findIndex((line) => line.type === 'reset');
  const tool = (resetIndex === -1 ? newestFirst : newestFirst.slice(0, resetIndex)).find((line) => line.type === 'tool');
  if (tool?.type === 'tool') return [`${usagePercentage(tool.usedTokens, tool.windowTokens)}%`, tool.zone];
  const percentage = input.payload?.usedPercentage;
  return percentage === null || percentage === undefined ? [] : [`${Math.floor(percentage)}%`];
}
