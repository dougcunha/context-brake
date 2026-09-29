import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { DiagnosticFinding } from '../contracts/diagnostics.js';
import type { LightModeUpdate } from './light-mode-merge.js';

const CONFIG_PATH = 'context-brake.config.json';
const REMEDIATION = 'Run context-brake init --no-light to keep the full mode, or context-brake init --light to return to the light mode.';

export function lightDefaultAppliedFinding(): DiagnosticFinding {
  return {
    code: 'LIGHT_MODE_DEFAULT_APPLIED', severity: 'ok', scope: 'project', harness: null, path: CONFIG_PATH,
    message: 'The installation switched to the light mode, which is the default: telemetry only, with no brake, plan, checkpoint, protocol, or instruction blocks.',
    impact: null, remediation: REMEDIATION,
  };
}
export function lightDefaultPendingFinding(): DiagnosticFinding {
  return {
    code: 'LIGHT_MODE_DEFAULT_PENDING', severity: 'ok', scope: 'project', harness: null, path: CONFIG_PATH,
    message: 'The next plain context-brake init switches this installation to the light mode, which is now the default.',
    impact: 'The plan, checkpoint, protocol, and instruction blocks are removed on that run.',
    remediation: REMEDIATION,
  };
}
export function isLightDefaultPending(config: ContextBrakeConfig | null): boolean {
  return config?.lightMode === undefined && config?.fullMode === undefined;
}
export function lightDefaultAppliedFindings(config: ContextBrakeConfig | null, update: LightModeUpdate): readonly DiagnosticFinding[] {
  return update.kind === 'set' && isLightDefaultPending(config) ? [lightDefaultAppliedFinding()] : [];
}
