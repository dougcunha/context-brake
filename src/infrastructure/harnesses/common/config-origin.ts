import { readFile } from 'node:fs/promises';
import { findNodeAtLocation, getNodeValue, parseTree } from 'jsonc-parser';
import type { AdapterPlan } from '../../../core/contracts/adapter.js';
import type { PlannedChange } from '../../../core/contracts/changes.js';
import type { ConfigOrigin, InstallationManifest } from '../../../core/contracts/manifest.js';
import { parseAndValidateJson, removeJsonProperty } from '../../storage/json-document-editor.js';

export type ScalarDefaults = Readonly<Record<string, string | number | boolean>>;
export type OriginTarget = { readonly path: string; readonly manifest?: InstallationManifest | null | undefined; readonly defaults?: ScalarDefaults };

function topLevelKeys(text: string): string[] {
  const root = parseTree(text, [], { disallowComments: false });
  if (root?.type !== 'object') return [];
  return (root.children ?? []).map((property) => String(property.children?.[0]?.value));
}
function isEmptyContainer(value: unknown): boolean {
  if (Array.isArray(value)) return value.length === 0;
  return typeof value === 'object' && value !== null && Object.keys(value).length === 0;
}
function removeAddedKeys(text: string, origin: ConfigOrigin, defaults: ScalarDefaults): string {
  return origin.addedKeys.reduce((current, key) => {
    const node = findNodeAtLocation(parseAndValidateJson(current), [key]);
    if (!node) return current;
    const value: unknown = getNodeValue(node);
    return isEmptyContainer(value) || value === defaults[key] ? removeJsonProperty(current, [key]) : current;
  }, text);
}
function restoreChange(change: PlannedChange, origin: ConfigOrigin, defaults: ScalarDefaults): PlannedChange {
  if (change.path !== origin.path || change.kind !== 'update' || change.content === null) return change;
  const content = removeAddedKeys(change.content, origin, defaults);
  if (origin.created && /^\s*\{\s*\}\s*$/.test(content)) return { ...change, kind: 'delete', content: null, preview: { summary: `Delete ${origin.path}, created by init` } };
  return { ...change, content };
}
function recordConfigOrigin(target: OriginTarget, original: string | null, installed: string): ConfigOrigin {
  const path = target.path;
  const recorded = target.manifest?.configOrigins?.find((origin) => origin.path === path);
  if (recorded) return recorded;
  const before = new Set(original === null ? [] : topLevelKeys(original));
  return { path, created: original === null, addedKeys: topLevelKeys(installed).filter((key) => !before.has(key)) };
}
export async function attachConfigOrigin(plan: AdapterPlan, target: OriginTarget): Promise<AdapterPlan> {
  const change = plan.changes.find((item) => item.path === target.path);
  if (!change || change.content === null) return plan;
  const original = await readFile(change.realPath, 'utf8').catch(() => null);
  return { ...plan, configOrigins: [recordConfigOrigin(target, original, change.content)] };
}
export function applyConfigOrigin(plan: AdapterPlan, target: OriginTarget): AdapterPlan {
  const origin = target.manifest?.configOrigins?.find((item) => item.path === target.path);
  if (!origin) return plan;
  return { ...plan, changes: plan.changes.map((change) => restoreChange(change, origin, target.defaults ?? {})) };
}
