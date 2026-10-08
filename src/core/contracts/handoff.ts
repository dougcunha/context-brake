import type { ClaimDeadline } from './hook-phase.js';

export const HANDOFF_RELATIVE_PATH = '.context-brake/handoff.md';
export const HANDOFF_ARCHIVE_RELATIVE_DIR = '.context-brake/handoffs';
export const HANDOFF_ARCHIVE_LIMIT = 10;

export interface HandoffReader {
  pendingSince(): Promise<number | null>;
}

export interface HandoffStore extends HandoffReader {
  claim(deadline?: ClaimDeadline): Promise<string | null>;
}
