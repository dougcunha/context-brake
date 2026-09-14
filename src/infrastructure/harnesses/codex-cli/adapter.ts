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
import { CODEX_EXECUTABLES, detectCodex } from './detector.js';
import { CODEX_CONFIG_FILE, CODEX_HOOK_FILE, planCodexInstall, planCodexRemove } from './planner.js';

const CAPABILITIES: readonly CapabilityDefinition[] = [
  { id: 'pre_tool_block', state: 'supported' },
  { id: 'post_tool_telemetry', state: 'supported' },
  { id: 'session_boot', state: 'supported' },
  { id: 'context_usage', state: 'unsupported', impact: 'Context usage is not exposed to Codex CLI hooks.' },
  { id: 'timeout_fail_closed', state: 'unsupported', impact: 'Hosted tools bypass local tool hooks and hook failures are not guaranteed to fail closed.' },
];

export class CodexAdapter implements HarnessAdapter {
  readonly id = 'codex-cli';
  readonly executionModel = 'process' as const;

  capabilityProfile(version?: VersionProbe): CapabilityProfile {
    return deriveSupportProfile({ harness: this.id, capabilities: CAPABILITIES, version });
  }

  detect(context: HarnessContext): Promise<readonly DetectionEvidence[]> {
    return detectCodex(context.projectRoot, context.userHome);
  }

  probeVersion(context: HarnessContext): Promise<VersionProbe> {
    return probeExecutableVersion(context.runner, CODEX_EXECUTABLES);
  }

  planInstall(context: HarnessContext) {
    return planCodexInstall(context.projectRoot);
  }

  planRemove(context: HarnessContext) {
    return planCodexRemove(context.projectRoot);
  }

  async diagnose(context: HarnessContext): Promise<readonly DiagnosticFinding[]> {
    const findings: DiagnosticFinding[] = [];
    const configPath = resolve(context.projectRoot, CODEX_CONFIG_FILE);
    const hookPath = resolve(context.projectRoot, CODEX_HOOK_FILE);
    const tomlPath = resolve(context.projectRoot, '.codex/config.toml');
    if (!(await pathExists(configPath))) {
      findings.push(createIntegrationMissingFinding(this.id, CODEX_CONFIG_FILE));
    } else {
      try {
        const raw = await readFile(configPath, 'utf8');
        const validation = validateJsonDocument(raw);
        if (!validation.valid) {
          findings.push(createInvalidConfigFinding(this.id, CODEX_CONFIG_FILE, validation.errors.join('; ')));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        findings.push(createInvalidConfigFinding(this.id, CODEX_CONFIG_FILE, msg));
      }
    }
    if (!(await pathExists(hookPath))) findings.push(createAssetMissingFinding(this.id, CODEX_HOOK_FILE));
    if ((await pathExists(tomlPath)) && (await pathExists(configPath))) {
      const toml = await readFile(tomlPath, 'utf8').catch(() => '');
      if (toml.includes('[hooks]')) {
        findings.push(createLimitationFinding(this.id, 'MIXED_HOOK_REPRESENTATIONS', 'Both .codex/config.toml and .codex/hooks.json exist; Codex loads both with a warning.'));
      }
    }
    return findings;
  }

  benchmarkFixture(): BenchmarkFixture {
    return {
      harness: this.id,
      executionModel: 'process',
      targetMilliseconds: 100,
      samplePayload: { hook_event_name: 'PreToolUse', session_id: 'bench-codex', tool_name: 'Bash' },
    };
  }
}
