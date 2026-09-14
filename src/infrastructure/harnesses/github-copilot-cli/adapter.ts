import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { BenchmarkFixture, HarnessAdapter, HarnessContext } from '../../../core/contracts/adapter.js';
import type { DiagnosticFinding } from '../../../core/contracts/diagnostics.js';
import type { CapabilityDefinition, CapabilityProfile, DetectionEvidence, VersionProbe } from '../../../core/contracts/harness.js';
import { deriveSupportProfile } from '../../../core/services/support-service.js';
import { validateJsonDocument } from '../../storage/json-validator.js';
import { createAssetMissingFinding, createIntegrationMissingFinding, createInvalidConfigFinding, createLimitationFinding } from '../common/diagnostic-helpers.js';
import { pathExists } from '../common/path-helpers.js';
import { probeExecutableVersion } from '../common/version-probes.js';
import { COPILOT_EXECUTABLES, detectCopilot } from './detector.js';
import { COPILOT_CONFIG_FILE, COPILOT_HOOK_FILE, planCopilotInstall, planCopilotRemove } from './planner.js';

const TIMEOUT_IMPACT = 'A timed-out hook lets the tool call continue.';

const CAPABILITIES: readonly CapabilityDefinition[] = [
  { id: 'pre_tool_block', state: 'supported' },
  { id: 'post_tool_telemetry', state: 'supported' },
  { id: 'session_boot', state: 'supported' },
  { id: 'context_usage', state: 'unsupported', impact: 'Context usage is not exposed to GitHub Copilot CLI hooks.' },
  { id: 'timeout_fail_closed', state: 'unsupported', impact: TIMEOUT_IMPACT },
];

export class CopilotAdapter implements HarnessAdapter {
  readonly id = 'github-copilot-cli';
  readonly executionModel = 'process' as const;

  capabilityProfile(version?: VersionProbe): CapabilityProfile {
    return deriveSupportProfile({ harness: this.id, capabilities: CAPABILITIES, version });
  }

  detect(context: HarnessContext): Promise<readonly DetectionEvidence[]> {
    return detectCopilot(context.projectRoot, context.userHome);
  }

  probeVersion(context: HarnessContext): Promise<VersionProbe> {
    return probeExecutableVersion(context.runner, COPILOT_EXECUTABLES);
  }

  planInstall(context: HarnessContext) {
    return planCopilotInstall(context.projectRoot);
  }

  planRemove(context: HarnessContext) {
    return planCopilotRemove(context.projectRoot);
  }

  async diagnose(context: HarnessContext): Promise<readonly DiagnosticFinding[]> {
    const findings: DiagnosticFinding[] = [];
    const configPath = resolve(context.projectRoot, COPILOT_CONFIG_FILE);
    const hookPath = resolve(context.projectRoot, COPILOT_HOOK_FILE);
    if (!(await pathExists(configPath))) {
      findings.push(createIntegrationMissingFinding(this.id, COPILOT_CONFIG_FILE));
    } else {
      try {
        const raw = await readFile(configPath, 'utf8');
        const validation = validateJsonDocument(raw);
        if (!validation.valid) {
          findings.push(createInvalidConfigFinding(this.id, COPILOT_CONFIG_FILE, validation.errors.join('; ')));
        } else {
          findings.push(createLimitationFinding(this.id, 'COPILOT_TIMEOUT_LIMITATION', TIMEOUT_IMPACT));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        findings.push(createInvalidConfigFinding(this.id, COPILOT_CONFIG_FILE, msg));
      }
    }
    if (!(await pathExists(hookPath))) findings.push(createAssetMissingFinding(this.id, COPILOT_HOOK_FILE));
    return findings;
  }

  benchmarkFixture(): BenchmarkFixture {
    return {
      harness: this.id,
      executionModel: 'process',
      targetMilliseconds: 100,
      samplePayload: { event: 'preToolUse', sessionId: 'copilot-bench', toolName: 'run_command' },
    };
  }
}
