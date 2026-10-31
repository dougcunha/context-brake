import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { HarnessContext } from '../../../core/contracts/adapter.js';
import type { PlannedChange } from '../../../core/contracts/changes.js';
import type { InstallationManifest } from '../../../core/contracts/manifest.js';
import { validateJsonDocument } from '../../storage/json-validator.js';
import { applyConfigOrigin } from '../common/config-origin.js';
import { resolveChangeTarget } from '../common/change-target.js';
import { isLocalSettingsOwned } from './auto-restart-ownership.js';
import { isEmptySettings } from './auto-restart-settings.js';
import { applyHooks } from './claude-hooks-config.js';
import { CLAUDE_HOOK_SCRIPT } from './hook-script.js';
import { CLAUDE_LOCAL_SETTINGS_FILE, CLAUDE_SETTINGS_FILE } from './statusline-settings.js';

const EMPTY_SETTINGS_TEXT = '{\n}\n';

// Com o script fora do Git (gitIgnore), os hooks vão para o arquivo local, que o Claude Code também lê e o Git não versiona.
export function claudeHooksFile(context: Pick<HarnessContext, 'gitIgnore'>): string {
  return context.gitIgnore === true ? CLAUDE_LOCAL_SETTINGS_FILE : CLAUDE_SETTINGS_FILE;
}

export function otherHooksFile(file: string): string {
  return file === CLAUDE_SETTINGS_FILE ? CLAUDE_LOCAL_SETTINGS_FILE : CLAUDE_SETTINGS_FILE;
}

export async function readRaw(root: string, path: string): Promise<string | null> {
  return readFile(resolve(root, path), 'utf8').catch(() => null);
}

export function hasOwnedHooks(text: string): boolean {
  return validateJsonDocument(text).valid && applyHooks(text, false) !== text;
}

type LocalEdit = { readonly transform: (text: string) => string; readonly summary: string };

// O arquivo local também recebe a status line e o mod: parte do conteúdo que outro planejador já calculou, não do disco.
export async function upsertLocalChange(root: string, changes: readonly PlannedChange[], edit: LocalEdit): Promise<PlannedChange[]> {
  const existing = changes.find((change) => change.path === CLAUDE_LOCAL_SETTINGS_FILE);
  const disk = existing === undefined ? await readRaw(root, CLAUDE_LOCAL_SETTINGS_FILE) : null;
  const base = existing?.content ?? disk ?? EMPTY_SETTINGS_TEXT;
  const kind = existing === undefined ? (disk === null ? 'create' : 'update') : (existing.kind === 'delete' ? 'update' : existing.kind);
  const change: PlannedChange = { path: CLAUDE_LOCAL_SETTINGS_FILE, realPath: await resolveChangeTarget(root, CLAUDE_LOCAL_SETTINGS_FILE), kind, owner: 'harness_entry', content: edit.transform(base), preview: existing?.preview ?? { summary: edit.summary } };
  return [...changes.filter((candidate) => candidate.path !== CLAUDE_LOCAL_SETTINGS_FILE), change];
}

// Devolve a mudança sem as chaves que o init criou; apaga o arquivo que o init criou e que ficou vazio.
export async function settleChange(root: string, change: PlannedChange, manifest: InstallationManifest | null | undefined): Promise<PlannedChange> {
  const plan = { harness: 'claude-code' as const, changes: [change], conflicts: [], entries: [] };
  const [restored = change] = applyConfigOrigin(plan, { path: change.path, manifest }).changes;
  const dropsLocal = change.path === CLAUDE_LOCAL_SETTINGS_FILE && restored.kind === 'update' && restored.content !== null && isEmptySettings(restored.content) && await isLocalSettingsOwned(root);
  if (!dropsLocal) return restored;
  return { ...restored, kind: 'delete', content: null, preview: { summary: 'Delete the local settings left empty' } };
}

export async function ignoresHookScript(root: string): Promise<boolean> {
  const raw = await readRaw(root, '.gitignore');
  const lines = raw?.split(/\r?\n/).map((line) => line.trim()) ?? [];
  return lines.includes(`/${CLAUDE_HOOK_SCRIPT}`) || lines.includes(CLAUDE_HOOK_SCRIPT);
}
