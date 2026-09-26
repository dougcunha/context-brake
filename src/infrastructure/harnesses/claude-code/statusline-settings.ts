import { readFile } from 'node:fs/promises';
import { sep } from 'node:path';
import { findNodeAtLocation, getNodeValue } from 'jsonc-parser';
import { parseAndValidateJson, validateJsonDocument } from '../../storage/json-document-editor.js';
import { asRecord } from '../common/runtime-support.js';
import { STATUSLINE_PIPE_FLAG } from './statusline-bridge.js';
import type { StatuslineScope } from './statusline-state.js';

export const CLAUDE_LOCAL_SETTINGS_FILE = '.claude/settings.local.json';
export const CLAUDE_SETTINGS_FILE = '.claude/settings.json';
export const STATUSLINE_BRIDGE_FILE = '.claude/hooks/context-brake-statusline.mjs';
export const STATUSLINE_KEY = 'statusLine';

const STATUSLINE_COMMAND_TYPE = 'command';
const STATUSLINE_OPTION_KEYS = ['padding', 'refreshInterval'] as const;
const UNSUPPORTED_ROOT_CHARACTERS = /["`$\\]/;
const WINDOWS_SEPARATOR = '\\';

export type SettingsRead =
  | { readonly kind: 'absent' }
  | { readonly kind: 'invalid'; readonly detail: string }
  | { readonly kind: 'valid'; readonly text: string; readonly statusLine: unknown };
export type StatuslineObject = Record<string, unknown>;
export type StatuslineCandidate = { readonly source: StatuslineScope; readonly value: unknown };
export type PreviousStatusline = { readonly source: StatuslineScope; readonly command: string; readonly value: StatuslineObject };

export async function readSettings(filePath: string): Promise<SettingsRead> {
  let text: string;
  try {
    text = await readFile(filePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { kind: 'absent' };
    return { kind: 'invalid', detail: error instanceof Error ? error.message : String(error) };
  }
  const validation = validateJsonDocument(text);
  if (!validation.valid) return { kind: 'invalid', detail: validation.errors.join('; ') };
  const node = findNodeAtLocation(parseAndValidateJson(text), [STATUSLINE_KEY]);
  return { kind: 'valid', text, statusLine: node === undefined ? undefined : getNodeValue(node) as unknown };
}

export function statuslineOf(settings: SettingsRead): unknown {
  return settings.kind === 'valid' ? settings.statusLine : undefined;
}

export function commandOf(value: unknown): string | null {
  const record = asRecord(value);
  const command = record?.['command'];
  if (record?.['type'] !== STATUSLINE_COMMAND_TYPE || typeof command !== 'string' || command.trim() === '') return null;
  return command;
}

export function isBridgeStatusline(value: unknown): boolean {
  return commandOf(value)?.includes(STATUSLINE_BRIDGE_FILE) ?? false;
}

export function firstPreviousStatusline(candidates: readonly StatuslineCandidate[]): PreviousStatusline | null {
  for (const candidate of candidates) {
    const command = commandOf(candidate.value);
    const value = asRecord(candidate.value);
    if (command !== null && value !== null && !isBridgeStatusline(value)) return { source: candidate.source, command, value };
  }
  return null;
}

export function statuslineOptions(value: unknown): StatuslineObject {
  const record = asRecord(value) ?? {};
  return Object.fromEntries(STATUSLINE_OPTION_KEYS.filter((key) => typeof record[key] === 'number').map((key) => [key, record[key]]));
}

export function toCommandRoot(realRoot: string, separator: string = sep): string {
  return separator === WINDOWS_SEPARATOR ? realRoot.split(WINDOWS_SEPARATOR).join('/') : realRoot;
}

export function bridgeCommand(commandRoot: string, previousCommand: string | null): string | null {
  if (UNSUPPORTED_ROOT_CHARACTERS.test(commandRoot)) return null;
  const bridge = `node "${commandRoot}/${STATUSLINE_BRIDGE_FILE}"`;
  return previousCommand === null ? bridge : `${bridge} ${STATUSLINE_PIPE_FLAG} | ( ${previousCommand}\n)`;
}
