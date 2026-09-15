import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { BenchmarkFixture, HarnessAdapter, HarnessContext } from '../../../core/contracts/adapter.js';
import type { DiagnosticFinding } from '../../../core/contracts/diagnostics.js';
import type { CapabilityDefinition, CapabilityProfile, DetectionEvidence, VersionProbe } from '../../../core/contracts/harness.js';
import { deriveSupportProfile } from '../../../core/services/support-service.js';
import { validateJsonDocument } from '../../storage/json-validator.js';
import { createAssetMissingFinding, createIntegrationMissingFinding, createInvalidConfigFinding } from '../common/diagnostic-helpers.js';
import { pathExists } from '../common/path-helpers.js';
import { probeExecutableVersion } from '../common/version-probes.js';
import { ANTIGRAVITY_EXECUTABLES, detectAntigravity } from './detector.js';
import { ANTIGRAVITY_CONFIG_FILE, ANTIGRAVITY_HOOK_FILE, planAntigravityInstall, planAntigravityRemove } from './planner.js';

const CAPABILITIES: readonly CapabilityDefinition[] = [
  { id: 'pre_tool_block', state: 'supported' },
  { id: 'post_tool_telemetry', state: 'unsupported', impact: 'Antigravity CLI PostToolUse accepts only empty output; telemetry is indirect via PreInvocation.' },
  { id: 'session_boot', state: 'unsupported', impact: 'Session boot is indirect via PreInvocation.' },
  { id: 'context_usage', state: 'unsupported', impact: 'Context usage is not exposed to Antigravity CLI hooks.' },
  { id: 'timeout_fail_closed', state: 'unsupported', impact: 'Failure and timeout guarantees are undocumented for Antigravity CLI.' },
];

function hasInstalledIntegration(raw: string): boolean {
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const cb = obj['context-brake'] as Record<string, unknown> | undefined;
    const inv = cb?.PreInvocation;
    if (!Array.isArray(inv)) return false;
    return inv.some((h) => typeof h === 'object' && h !== null && typeof (h as { command?: unknown }).command === 'string' && (h as { command: string }).command.includes(ANTIGRAVITY_HOOK_FILE));
  } catch {
    return false;
  }
}

export class AntigravityAdapter implements HarnessAdapter {
  readonly id = 'antigravity-cli';
  readonly executionModel = 'process' as const;

  capabilityProfile(version?: VersionProbe): CapabilityProfile {
    return deriveSupportProfile({ harness: this.id, capabilities: CAPABILITIES, version });
  }

  detect(context: HarnessContext): Promise<readonly DetectionEvidence[]> {
    return detectAntigravity(context.projectRoot, context.userHome);
  }

  probeVersion(context: HarnessContext): Promise<VersionProbe> {
    return probeExecutableVersion(context.runner, ANTIGRAVITY_EXECUTABLES);
  }

  planInstall(context: HarnessContext) {
    return planAntigravityInstall(context.projectRoot);
  }

  planRemove(context: HarnessContext) {
    return planAntigravityRemove(context.projectRoot);
  }

  async diagnose(context: HarnessContext): Promise<readonly DiagnosticFinding[]> {
    const findings: DiagnosticFinding[] = [];
    const configPath = resolve(context.projectRoot, ANTIGRAVITY_CONFIG_FILE);
    const hookPath = resolve(context.projectRoot, ANTIGRAVITY_HOOK_FILE);
    if (!(await pathExists(configPath))) {
      findings.push(createIntegrationMissingFinding(this.id, ANTIGRAVITY_CONFIG_FILE));
    } else {
      try {
        const raw = await readFile(configPath, 'utf8');
        const validation = validateJsonDocument(raw);
        if (!validation.valid) {
          findings.push(createInvalidConfigFinding(this.id, ANTIGRAVITY_CONFIG_FILE, validation.errors.join('; ')));
        } else if (!hasInstalledIntegration(raw)) {
          findings.push(createIntegrationMissingFinding(this.id, ANTIGRAVITY_CONFIG_FILE));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        findings.push(createInvalidConfigFinding(this.id, ANTIGRAVITY_CONFIG_FILE, msg));
      }
    }
    if (!(await pathExists(hookPath))) findings.push(createAssetMissingFinding(this.id, ANTIGRAVITY_HOOK_FILE));
    return findings;
  }

  benchmarkFixture(): BenchmarkFixture {
    return {
      harness: this.id,
      executionModel: 'process',
      targetMilliseconds: 100,
      samplePayload: { hookName: 'PreToolUse', conversationId: 'agy-bench', toolName: 'bash' },
    };
  }
}
