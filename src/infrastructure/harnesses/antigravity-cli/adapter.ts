import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { BenchmarkFixture, HarnessAdapter, HarnessContext } from '../../../core/contracts/adapter.js';
import type { DiagnosticFinding } from '../../../core/contracts/diagnostics.js';
import type { CapabilityProfile, DetectionEvidence, VersionProbe } from '../../../core/contracts/harness.js';
import { deriveSupportProfile } from '../../../core/services/support-service.js';
import { validateJsonDocument } from '../../storage/json-validator.js';
import { createAssetMissingFinding, createIntegrationMissingFinding, createInvalidConfigFinding } from '../common/diagnostic-helpers.js';
import { pathExists } from '../common/path-helpers.js';
import { probeExecutableVersion } from '../common/version-probes.js';
import { ANTIGRAVITY_CAPABILITIES } from './capabilities.js';
import { ANTIGRAVITY_EXECUTABLES, detectAntigravity } from './detector.js';
import { ANTIGRAVITY_CONFIG_FILE, ANTIGRAVITY_HOOK_FILE, planAntigravityInstall, planAntigravityRemove } from './planner.js';

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
    return deriveSupportProfile({ harness: this.id, capabilities: ANTIGRAVITY_CAPABILITIES, version });
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
      event: 'PreInvocation',
      targetMilliseconds: 100,
      samplePayload: {
        conversationId: 'bench-antigravity',
        workspacePaths: ['/repo'],
        modelName: 'gemini',
        invocationNum: 1,
        initialNumSteps: 0,
      },
    };
  }
}
