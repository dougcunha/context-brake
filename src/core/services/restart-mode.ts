import type { ContextBrakeConfig } from '../contracts/configuration.js';

export const RESTART_MODES = ['off', 'snapshot', 'handoff'] as const;
export type RestartMode = (typeof RESTART_MODES)[number];

export function restartMode(config: Pick<ContextBrakeConfig, 'autoRestart' | 'snapshot'>): RestartMode {
  if (config.autoRestart === undefined) return 'off';
  return config.snapshot.command === undefined ? 'handoff' : 'snapshot';
}
