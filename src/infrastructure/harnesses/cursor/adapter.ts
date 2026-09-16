import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { BenchmarkFixture, HarnessAdapter, HarnessContext } from '../../../core/contracts/adapter.js';
import type { DiagnosticFinding } from '../../../core/contracts/diagnostics.js';
import { type CapabilityProfile, type DetectionEvidence, type VersionProbe } from '../../../core/contracts/harness.js';
import { deriveSupportProfile } from '../../../core/services/support-service.js';
import { validateJsonDocument } from '../../storage/json-validator.js';
import { createAssetMissingFinding, createIntegrationMissingFinding, createInvalidConfigFinding } from '../common/diagnostic-helpers.js';
import { pathExists } from '../common/path-helpers.js';
import { probeExecutableVersion } from '../common/version-probes.js';
import { CURSOR_CAPABILITIES } from './capabilities.js';
import { CURSOR_EXECUTABLES, detectCursor } from './detector.js';
import { CURSOR_CONFIG_FILE, CURSOR_HOOK_FILE, planCursorInstall, planCursorRemove } from './planner.js';

export class CursorAdapter implements HarnessAdapter {
  readonly id = 'cursor';
  readonly executionModel = 'process' as const;

  capabilityProfile(version?: VersionProbe): CapabilityProfile {
    return deriveSupportProfile({ harness: this.id, capabilities: CURSOR_CAPABILITIES, version });
  }

  detect(context: HarnessContext): Promise<readonly DetectionEvidence[]> {
    return detectCursor(context.projectRoot, context.userHome);
  }

  probeVersion(context: HarnessContext): Promise<VersionProbe> {
    return probeExecutableVersion(context.runner, CURSOR_EXECUTABLES);
  }

  planInstall(context: HarnessContext) {
    return planCursorInstall(context.projectRoot);
  }

  planRemove(context: HarnessContext) {
    return planCursorRemove(context.projectRoot);
  }

  async diagnose(context: HarnessContext): Promise<readonly DiagnosticFinding[]> {
    const findings: DiagnosticFinding[] = [];
    const configPath = resolve(context.projectRoot, CURSOR_CONFIG_FILE);
    const hookPath = resolve(context.projectRoot, CURSOR_HOOK_FILE);
    if (!(await pathExists(configPath))) {
      findings.push(createIntegrationMissingFinding(this.id, CURSOR_CONFIG_FILE));
    } else {
      try {
        const raw = await readFile(configPath, 'utf8');
        const validation = validateJsonDocument(raw);
        if (!validation.valid) {
          findings.push(createInvalidConfigFinding(this.id, CURSOR_CONFIG_FILE, validation.errors.join('; ')));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        findings.push(createInvalidConfigFinding(this.id, CURSOR_CONFIG_FILE, msg));
      }
    }
    if (!(await pathExists(hookPath))) findings.push(createAssetMissingFinding(this.id, CURSOR_HOOK_FILE));
    return findings;
  }

  benchmarkFixture(): BenchmarkFixture {
    return {
      harness: this.id,
      executionModel: 'process',
      event: 'preToolUse',
      targetMilliseconds: 100,
      samplePayload: {
        conversation_id: 'bench-cursor',
        hook_event_name: 'preToolUse',
        tool_name: 'Shell',
        tool_input: { command: 'ls' },
        tool_use_id: 'toolu_bench',
      },
    };
  }
}
