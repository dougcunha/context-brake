import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { BenchmarkFixture, HarnessAdapter, HarnessContext } from '../../../core/contracts/adapter.js';
import type { DiagnosticFinding } from '../../../core/contracts/diagnostics.js';
import { CAPABILITY_IDS, type CapabilityDefinition, type CapabilityProfile, type DetectionEvidence, type VersionProbe } from '../../../core/contracts/harness.js';
import { deriveSupportProfile } from '../../../core/services/support-service.js';
import { validateJsonDocument } from '../../storage/json-validator.js';
import { createIntegrationMissingFinding, createInvalidConfigFinding } from '../common/diagnostic-helpers.js';
import { pathExists } from '../common/path-helpers.js';
import { probeExecutableVersion } from '../common/version-probes.js';
import { detectOmp, OMP_EXECUTABLES } from './detector.js';
import { OMP_EXTENSION_FILE, planOmpInstall, planOmpRemove } from './planner.js';

const CAPABILITIES: readonly CapabilityDefinition[] = CAPABILITY_IDS.map((id) => ({ id, state: 'supported' }));

export class OhMyPiAdapter implements HarnessAdapter {
  readonly id = 'oh-my-pi';
  readonly executionModel = 'in_process' as const;

  capabilityProfile(version?: VersionProbe): CapabilityProfile {
    return deriveSupportProfile({ harness: this.id, capabilities: CAPABILITIES, version });
  }

  detect(context: HarnessContext): Promise<readonly DetectionEvidence[]> {
    return detectOmp(context.projectRoot, context.userHome);
  }

  probeVersion(context: HarnessContext): Promise<VersionProbe> {
    return probeExecutableVersion(context.runner, OMP_EXECUTABLES);
  }

  planInstall(context: HarnessContext) {
    return planOmpInstall(context.projectRoot);
  }

  planRemove(context: HarnessContext) {
    return planOmpRemove(context.projectRoot);
  }

  async diagnose(context: HarnessContext): Promise<readonly DiagnosticFinding[]> {
    const findings: DiagnosticFinding[] = [];
    const extensionPath = resolve(context.projectRoot, OMP_EXTENSION_FILE);
    const settingsPath = resolve(context.projectRoot, '.omp/settings.json');
    if (!(await pathExists(extensionPath))) {
      findings.push(createIntegrationMissingFinding(this.id, OMP_EXTENSION_FILE));
    }
    if (await pathExists(settingsPath)) {
      try {
        const raw = await readFile(settingsPath, 'utf8');
        const validation = validateJsonDocument(raw);
        if (!validation.valid) {
          findings.push(createInvalidConfigFinding(this.id, '.omp/settings.json', validation.errors.join('; ')));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        findings.push(createInvalidConfigFinding(this.id, '.omp/settings.json', msg));
      }
    }
    return findings;
  }

  benchmarkFixture(): BenchmarkFixture {
    return {
      harness: this.id,
      executionModel: 'in_process',
      targetMilliseconds: 15,
      samplePayload: { name: 'edit_file', content: 'hello' },
    };
  }
}
