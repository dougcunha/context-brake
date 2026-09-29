import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { ContextWindowReport } from '../contracts/context-window-report.js';
import type { DiagnosticFinding, DoctorReport, HarnessDiagnostic } from '../contracts/diagnostics.js';
import type { HarnessId } from '../contracts/harness.js';

export type BrakeWindowEntry = NonNullable<DoctorReport['brakeWindow']>[number];
export type BrakeWindowInput = { readonly config: ContextBrakeConfig | null; readonly integrations: readonly HarnessDiagnostic[]; readonly bridge: ContextWindowReport['bridge'] | undefined };

const DENYING_REASONS: ReadonlySet<BrakeWindowEntry['reason']> = new Set(['harness', 'declared', 'bridge']);
const CLAUDE_CODE: HarnessId = 'claude-code';

export function brakeWindowReport(input: BrakeWindowInput): BrakeWindowEntry[] {
  return input.integrations.map((integration) => {
    const reason = reasonFor(integration, input);
    return { harness: integration.harness, canDeny: DENYING_REASONS.has(reason), reason };
  });
}
function reasonFor(integration: HarnessDiagnostic, input: BrakeWindowInput): BrakeWindowEntry['reason'] {
  if (integration.harness === CLAUDE_CODE) return input.bridge === 'installed' ? 'bridge' : 'bridge_absent';
  const state = integration.support.capabilities.find((entry) => entry.id === 'context_usage')?.state;
  if (state === 'supported') return 'harness';
  return state === 'unsupported' && input.config?.telemetry.declaredContextWindow !== undefined ? 'declared' : 'no_source';
}
export function bridgeAbsentFindings(entries: readonly BrakeWindowEntry[], bridge: ContextWindowReport['bridge'] | undefined): DiagnosticFinding[] {
  if (bridge !== 'absent' || !entries.some((entry) => entry.harness === CLAUDE_CODE)) return [];
  return [{
    code: 'STATUSLINE_BRIDGE_ABSENT', severity: 'warning', scope: 'harness', harness: CLAUDE_CODE, path: null,
    message: 'The Claude Code status line bridge is not installed, so the brake only warns in Claude Code.',
    impact: 'The context window falls back to contextWindowCeiling, which never blocks a tool call.',
    remediation: 'Run context-brake init. After --no-statusline-bridge, run context-brake init --statusline-bridge.',
  }];
}
