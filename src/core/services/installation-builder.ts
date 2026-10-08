import { resolve } from 'node:path';
import { configurationSchema, DEFAULT_CONFIG, DEFAULT_SNAPSHOT, type ContextBrakeConfig, type HarnessId, type SnapshotConfig } from '../contracts/configuration.js';
import type { FileSnapshot, PlannedChange } from '../contracts/changes.js';
import { applySnapshot, type SnapshotUpdate } from './snapshot-merge.js';
import { applyAutoRestart, type AutoRestartUpdate } from './auto-restart-merge.js';
import { applyDebugMode, type DebugModeUpdate } from './debug-mode-merge.js';
import { normalizeTurnLimits } from './config-legacy-checks.js';
import type { DroppedKey } from '../validation/configuration-sanitizer.js';
import { applyExclusion } from './harness-exclusion.js';

const KEEP = { kind: 'keep' } as const;
const CONFIG_KEY_ORDER = Object.keys(configurationSchema.shape);
const DEBUG_SUMMARY = { set: 'set the debug mode (agent prints context usage)', remove: 'remove the debug mode' } as const;
const AUTO_RESTART_SUMMARY = { set: 'turn on the automatic restart for interactive Claude Code', remove: 'turn off the automatic restart' } as const;
const CONFIG_SUMMARY = 'Configure ContextBrake active harnesses and zones';
const DROPPED_SUMMARY = 'drop unrecognized keys:';

export type ConfigChangeInput = {
  root: string;
  current: ContextBrakeConfig | null;
  active: readonly HarnessId[];
  snapshot?: FileSnapshot | null | undefined;
  snapshotUpdate?: SnapshotUpdate | undefined;
  debug?: DebugModeUpdate | undefined;
  autoRestart?: AutoRestartUpdate | undefined;
  dropped?: readonly DroppedKey[] | undefined;
  excluded?: readonly HarnessId[] | undefined;
  retained?: readonly HarnessId[] | undefined;
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
  const excluded = typeof rootOrInput === 'string' ? undefined : rootOrInput.excluded;
  const retained = typeof rootOrInput === 'string' ? [] : rootOrInput.retained ?? [];
  const merged = Array.from(new Set([...(curr?.activeHarnesses ?? []), ...act].filter((harness) => !(excluded ?? []).includes(harness)).concat(retained))).sort();
  const update = typeof rootOrInput === 'string' ? KEEP : rootOrInput.snapshotUpdate ?? KEEP;
  const debug = typeof rootOrInput === 'string' ? KEEP : rootOrInput.debug ?? KEEP;
  const autoRestart = typeof rootOrInput === 'string' ? KEEP : rootOrInput.autoRestart ?? KEEP;
  const base = applyDebugMode(applySnapshot(curr ? { ...curr, activeHarnesses: merged, telemetry: normalizeTurnLimits(curr.telemetry) } : { ...DEFAULT_CONFIG, activeHarnesses: merged }, update), debug);
  const config: ContextBrakeConfig = inSchemaOrder(applyExclusion(applyAutoRestart(base, autoRestart), excluded));
  const content = `${JSON.stringify(config, null, 2)}\n`;
  const defaultPath = resolve(root, 'context-brake.config.json').replace(/\\/g, '/');
  const realPath = (snap?.realPath ?? defaultPath).replace(/\\/g, '/');
  const change: PlannedChange = {
    path: 'context-brake.config.json',
    realPath,
    kind: curr ? 'update' : 'create',
    owner: 'config',
    content,
    preview: { summary: configSummary({ snapshot: config.snapshot ?? DEFAULT_SNAPSHOT, debug, autoRestart, dropped: typeof rootOrInput === 'string' ? [] : rootOrInput.dropped ?? [] }) },
  };
  return { config, change };
}

function inSchemaOrder(config: ContextBrakeConfig): ContextBrakeConfig {
  return Object.fromEntries(CONFIG_KEY_ORDER.filter((key) => key in config).map((key) => [key, config[key as keyof ContextBrakeConfig]])) as ContextBrakeConfig;
}
function autoRestartSummary(update: Exclude<AutoRestartUpdate, { kind: 'keep' }>): string {
  if (update.kind === 'set' && update.maxConsecutiveRestarts !== undefined) return `${AUTO_RESTART_SUMMARY.set}, at most ${update.maxConsecutiveRestarts} consecutive restarts`;
  return AUTO_RESTART_SUMMARY[update.kind];
}
type SummaryUpdates = { snapshot: SnapshotConfig; debug: DebugModeUpdate; autoRestart: AutoRestartUpdate; dropped: readonly DroppedKey[] };

function configSummary(updates: SummaryUpdates): string {
  const { snapshot, debug, autoRestart, dropped } = updates;
  const debugPart = debug.kind === 'keep' ? [] : [DEBUG_SUMMARY[debug.kind]];
  const autoRestartPart = autoRestart.kind === 'keep' ? [] : [autoRestartSummary(autoRestart)];
  const droppedPart = dropped.length === 0 ? [] : [`${DROPPED_SUMMARY} ${dropped.map((key) => key.path).join(', ')}`];
  return [CONFIG_SUMMARY, snapshotSummary(snapshot), ...debugPart, ...autoRestartPart, ...droppedPart].join('; ');
}
function snapshotSummary(section: SnapshotConfig): string {
  if (section.command === undefined) return `no snapshot command, so only zone headers will be injected (trigger: ${section.triggerZone})`;
  const resume = section.resumeCommand === undefined ? '' : `, resume command ${section.resumeCommand}`;
  return `snapshot command ${section.command} at ${section.triggerZone}${resume}`;
}
