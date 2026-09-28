import { resolve } from 'node:path';
import { configurationSchema, DEFAULT_CONFIG, type ContextBrakeConfig, type HarnessId } from '../contracts/configuration.js';
import type { FileSnapshot, PlannedChange } from '../contracts/changes.js';
import { applyDelegatedSnapshot, type DelegatedSnapshotUpdate } from './delegated-snapshot-merge.js';
import { applyDebugMode, type DebugModeUpdate } from './debug-mode-merge.js';
import { applyLightMode, type LightModeUpdate } from './light-mode-merge.js';
import { normalizeTurnLimits } from './config-legacy-checks.js';
import { MANIFEST_RELATIVE_PATH, type InstallationManifest, type ManagedAsset, type ManagedEntry } from '../contracts/manifest.js';

const KEEP: DelegatedSnapshotUpdate = { kind: 'keep' };
const CONFIG_KEY_ORDER = Object.keys(configurationSchema.shape);
const DEBUG_SUMMARY = { set: 'set the debug mode (agent prints context usage)', remove: 'remove the debug mode' } as const;
const LIGHT_SUMMARY = { set: 'set the light mode section (telemetry only: no brake, plan, checkpoint, protocol, or instruction blocks)', remove: 'remove the light mode section' } as const;
const CONFIG_SUMMARY = 'Configure ContextBrake active harnesses and zones';

export type ConfigChangeInput = {
  root: string;
  current: ContextBrakeConfig | null;
  active: readonly HarnessId[];
  snapshot?: FileSnapshot | null | undefined;
  delegatedSnapshot?: DelegatedSnapshotUpdate | undefined;
  lightMode?: LightModeUpdate | undefined;
  debug?: DebugModeUpdate | undefined;
};

export function planConfigChange(
  rootOrInput: string | ConfigChangeInput,
  current?: ContextBrakeConfig | null,
  active?: readonly HarnessId[],
): { config: ContextBrakeConfig; change: PlannedChange } {
  const root = typeof rootOrInput === 'string' ? rootOrInput : rootOrInput.root;
  const curr = typeof rootOrInput === 'string' ? (current ?? null) : rootOrInput.current;
  const act = typeof rootOrInput === 'string' ? (active ?? []) : rootOrInput.active;
  const snap = typeof rootOrInput === 'string' ? null : rootOrInput.snapshot;
  const merged = Array.from(new Set([...(curr?.activeHarnesses ?? []), ...act])).sort();
  const update = typeof rootOrInput === 'string' ? KEEP : rootOrInput.delegatedSnapshot ?? KEEP;
  const light = typeof rootOrInput === 'string' ? KEEP : rootOrInput.lightMode ?? KEEP;
  const debug = typeof rootOrInput === 'string' ? KEEP : rootOrInput.debug ?? KEEP;
  const config: ContextBrakeConfig = inSchemaOrder(applyDebugMode(applyLightMode(applyDelegatedSnapshot(curr ? { ...curr, activeHarnesses: merged, telemetry: normalizeTurnLimits(curr.telemetry) } : { ...DEFAULT_CONFIG, activeHarnesses: merged }, update), light), debug));
  const content = `${JSON.stringify(config, null, 2)}\n`;
  const defaultPath = resolve(root, 'context-brake.config.json').replace(/\\/g, '/');
  const realPath = (snap?.realPath ?? defaultPath).replace(/\\/g, '/');
  const change: PlannedChange = {
    path: 'context-brake.config.json',
    realPath,
    kind: curr ? 'update' : 'create',
    owner: 'config',
    content,
    preview: { summary: configSummary(update, light, debug) },
  };
  return { config, change };
}

function inSchemaOrder(config: ContextBrakeConfig): ContextBrakeConfig {
  return Object.fromEntries(CONFIG_KEY_ORDER.filter((key) => key in config).map((key) => [key, config[key as keyof ContextBrakeConfig]])) as ContextBrakeConfig;
}
function configSummary(delegated: DelegatedSnapshotUpdate, light: LightModeUpdate, debug: DebugModeUpdate): string {
  const delegatedPart = delegated.kind === 'keep' ? [] : [`${delegated.kind} the delegated snapshot section`];
  const lightPart = light.kind === 'keep' ? [] : [LIGHT_SUMMARY[light.kind]];
  const debugPart = debug.kind === 'keep' ? [] : [DEBUG_SUMMARY[debug.kind]];
  return [CONFIG_SUMMARY, ...delegatedPart, ...lightPart, ...debugPart].join('; ');
}

export type ManifestChangeInput = {
  root: string;
  assets: readonly ManagedAsset[];
  entries: readonly ManagedEntry[];
  prev: InstallationManifest | null;
  pkgVer: string;
  snapshot?: FileSnapshot | null | undefined;
};

export function planManifestChange(input: ManifestChangeInput): PlannedChange {
  const manifest: InstallationManifest = { schemaVersion: 1, packageVersion: input.pkgVer, assets: input.assets, entries: input.entries };
  const content = `${JSON.stringify(manifest, null, 2)}\n`;
  const defaultPath = resolve(input.root, MANIFEST_RELATIVE_PATH).replace(/\\/g, '/');
  const realPath = (input.snapshot?.realPath ?? defaultPath).replace(/\\/g, '/');
  return {
    path: MANIFEST_RELATIVE_PATH,
    realPath,
    kind: input.prev ? 'update' : 'create',
    owner: 'manifest',
    content,
    preview: { summary: 'Record installation manifest with managed assets and entries' },
  };
}
