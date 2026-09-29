import type { ContextBrakeConfig } from '../contracts/configuration.js';
import { isDebugModeInEffect } from './debug-mode-merge.js';

export const CURRENT_START_MARKER = '<!-- CONTEXTBRAKE:START -->' as const;
export const CURRENT_END_MARKER = '<!-- CONTEXTBRAKE:END -->' as const;
export const LEGACY_START_MARKER = '<!-- CONTEXTOPS:START -->' as const;
export const LEGACY_END_MARKER = '<!-- CONTEXTOPS:END -->' as const;

const LEGACY_PROTOCOL_PATTERNS = [
  /##\s*\[PROTOCOL\]/i,
  /Checkpoint-Driven/i,
  /\[CONTEXTOPS/i,
  /ZONA (VERDE|AMARELA|VERMELHA)/i,
  /Regras Obrigat/i,
  /\[REQUEST_SESSION_RESET\]/i,
  /follow `docs\/contextops-protocol/i,
  /Gest[aã]o Aut[oô]noma/i,
];

export const DEBUG_MODE_LINE = 'Debug mode: end each reply that received a ContextBrake telemetry block with the line `📊 ContextBrake: <usage>% · <used>/<window> (<window origin>) · <source> · <ZONE>`, copied from the latest block.';

export type ReferenceBlockOptions = { readonly planFile: string; readonly protocolFile: string; readonly debug: boolean };

export function renderReferenceBlock(options: ReferenceBlockOptions, eol = '\n'): string {
  return [
    CURRENT_START_MARKER,
    `When \`${options.planFile}\` exists or tool results include a ContextBrake telemetry block, follow \`${options.protocolFile}\`.`,
    ...(options.debug ? [DEBUG_MODE_LINE] : []),
    CURRENT_END_MARKER,
  ].join(eol);
}
export function referenceBlockFor(config: ContextBrakeConfig, eol = '\n'): string {
  return renderReferenceBlock({ planFile: config.stateStorage.planFile, protocolFile: config.instructionFiles.protocolFile, debug: isDebugModeInEffect(config) }, eol);
}

export function extractUnmatchedLegacyContent(legacyBody: string, eol: string): string {
  const lines = legacyBody.split(/\r?\n/);
  const unmatched = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    return !LEGACY_PROTOCOL_PATTERNS.some((pat) => pat.test(trimmed));
  });
  return unmatched.length > 0 ? unmatched.join(eol) : '';
}

export function countOccurrences(source: string, sub: string): number {
  let count = 0;
  let pos = 0;
  while ((pos = source.indexOf(sub, pos)) !== -1) {
    count++;
    pos += sub.length;
  }
  return count;
}
