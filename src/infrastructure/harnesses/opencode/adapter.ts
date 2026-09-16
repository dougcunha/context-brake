import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { BenchmarkFixture, HarnessAdapter, HarnessContext } from '../../../core/contracts/adapter.js';
import type { DiagnosticFinding } from '../../../core/contracts/diagnostics.js';
import { type CapabilityProfile, type DetectionEvidence, type VersionProbe } from '../../../core/contracts/harness.js';
import { deriveSupportProfile } from '../../../core/services/support-service.js';
import { validateJsonDocument } from '../../storage/json-validator.js';
import { createIntegrationMissingFinding, createInvalidConfigFinding } from '../common/diagnostic-helpers.js';
import { pathExists } from '../common/path-helpers.js';
import { probeExecutableVersion } from '../common/version-probes.js';
import { detectOpenCode, OPENCODE_EXECUTABLES } from './detector.js';
import { OPENCODE_CAPABILITIES } from './capabilities.js';
import { OPENCODE_PLUGIN_FILE, planOpenCodeInstall, planOpenCodeRemove } from './planner.js';

export class OpenCodeAdapter implements HarnessAdapter {
  readonly id = 'opencode';
  readonly executionModel = 'in_process' as const;

  capabilityProfile(version?: VersionProbe): CapabilityProfile {
    return deriveSupportProfile({ harness: this.id, capabilities: OPENCODE_CAPABILITIES, version });
  }

  detect(context: HarnessContext): Promise<readonly DetectionEvidence[]> {
    return detectOpenCode(context.projectRoot, context.userHome);
  }

  probeVersion(context: HarnessContext): Promise<VersionProbe> {
    return probeExecutableVersion(context.runner, OPENCODE_EXECUTABLES);
  }

  planInstall(context: HarnessContext) {
    return planOpenCodeInstall(context.projectRoot);
  }

  planRemove(context: HarnessContext) {
    return planOpenCodeRemove(context.projectRoot);
  }

  async diagnose(context: HarnessContext): Promise<readonly DiagnosticFinding[]> {
    const findings: DiagnosticFinding[] = [];
    const pluginPath = resolve(context.projectRoot, OPENCODE_PLUGIN_FILE);
    const jsonPath = resolve(context.projectRoot, 'opencode.json');
    if (!(await pathExists(pluginPath))) {
      findings.push(createIntegrationMissingFinding(this.id, OPENCODE_PLUGIN_FILE));
    }
    if (await pathExists(jsonPath)) {
      try {
        const raw = await readFile(jsonPath, 'utf8');
        const validation = validateJsonDocument(raw);
        if (!validation.valid) {
          findings.push(createInvalidConfigFinding(this.id, 'opencode.json', validation.errors.join('; ')));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        findings.push(createInvalidConfigFinding(this.id, 'opencode.json', msg));
      }
    }
    return findings;
  }

  benchmarkFixture(): BenchmarkFixture {
    return {
      harness: this.id,
      executionModel: 'in_process',
      event: 'tool.execute.before',
      targetMilliseconds: 15,
      samplePayload: {
        input: { tool: 'bash', sessionID: 'bench-opencode', callID: 'call_bench' },
        output: { args: { command: 'ls' } },
      },
    };
  }
}
