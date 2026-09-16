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
import { detectPi, PI_EXECUTABLES } from './detector.js';
import { PI_CAPABILITIES } from './capabilities.js';
import { PI_EXTENSION_FILE, planPiInstall, planPiRemove } from './planner.js';

export class PiAdapter implements HarnessAdapter {
  readonly id = 'pi';
  readonly executionModel = 'in_process' as const;

  capabilityProfile(version?: VersionProbe): CapabilityProfile {
    return deriveSupportProfile({ harness: this.id, capabilities: PI_CAPABILITIES, version });
  }

  detect(context: HarnessContext): Promise<readonly DetectionEvidence[]> {
    return detectPi(context.projectRoot, context.userHome);
  }

  probeVersion(context: HarnessContext): Promise<VersionProbe> {
    return probeExecutableVersion(context.runner, PI_EXECUTABLES);
  }

  planInstall(context: HarnessContext) {
    return planPiInstall(context.projectRoot);
  }

  planRemove(context: HarnessContext) {
    return planPiRemove(context.projectRoot);
  }

  async diagnose(context: HarnessContext): Promise<readonly DiagnosticFinding[]> {
    const findings: DiagnosticFinding[] = [];
    const extensionPath = resolve(context.projectRoot, PI_EXTENSION_FILE);
    const settingsPath = resolve(context.projectRoot, '.pi/settings.json');
    if (!(await pathExists(extensionPath))) {
      findings.push(createIntegrationMissingFinding(this.id, PI_EXTENSION_FILE));
    }
    if (await pathExists(settingsPath)) {
      try {
        const raw = await readFile(settingsPath, 'utf8');
        const validation = validateJsonDocument(raw);
        if (!validation.valid) {
          findings.push(createInvalidConfigFinding(this.id, '.pi/settings.json', validation.errors.join('; ')));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        findings.push(createInvalidConfigFinding(this.id, '.pi/settings.json', msg));
      }
    }
    return findings;
  }

  benchmarkFixture(): BenchmarkFixture {
    return {
      harness: this.id,
      executionModel: 'in_process',
      event: 'tool_call',
      targetMilliseconds: 15,
      samplePayload: { toolName: 'read', toolCallId: 'call_bench', input: { path: 'file.txt' } },
    };
  }
}
