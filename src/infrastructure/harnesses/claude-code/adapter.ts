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
import { CLAUDE_CAPABILITIES } from './capabilities.js';
import { isTargetGroup } from './claude-merger.js';
import { CLAUDE_EXECUTABLES, detectClaude } from './detector.js';
import { CLAUDE_CONFIG_FILE, CLAUDE_HOOK_FILE, planClaudeInstall, planClaudeRemove } from './planner.js';
import { diagnoseStatusline } from './statusline-diagnostics.js';

export class ClaudeAdapter implements HarnessAdapter {
  readonly id = 'claude-code';
  readonly executionModel = 'process' as const;

  capabilityProfile(version?: VersionProbe): CapabilityProfile {
    return deriveSupportProfile({ harness: this.id, capabilities: CLAUDE_CAPABILITIES, version });
  }

  detect(context: HarnessContext): Promise<readonly DetectionEvidence[]> {
    return detectClaude(context.projectRoot, context.userHome);
  }

  probeVersion(context: HarnessContext): Promise<VersionProbe> {
    return probeExecutableVersion(context.runner, CLAUDE_EXECUTABLES);
  }

  planInstall(context: HarnessContext) {
    return planClaudeInstall(context);
  }

  planRemove(context: HarnessContext) {
    return planClaudeRemove(context.projectRoot);
  }

  async diagnose(context: HarnessContext): Promise<readonly DiagnosticFinding[]> {
    const findings: DiagnosticFinding[] = [];
    const configPath = resolve(context.projectRoot, CLAUDE_CONFIG_FILE);
    const hookPath = resolve(context.projectRoot, CLAUDE_HOOK_FILE);
    if (!(await pathExists(configPath))) {
      findings.push(createIntegrationMissingFinding(this.id, CLAUDE_CONFIG_FILE));
    } else {
      try {
        const raw = await readFile(configPath, 'utf8');
        const validation = validateJsonDocument(raw);
        if (!validation.valid) {
          findings.push(createInvalidConfigFinding(this.id, CLAUDE_CONFIG_FILE, validation.errors.join('; ')));
        } else {
          const obj = JSON.parse(raw) as { hooks?: Record<string, unknown> };
          const pre = obj.hooks?.PreToolUse;
          if (!Array.isArray(pre) || !pre.some((g) => isTargetGroup(g, 'PreToolUse'))) {
            findings.push(createIntegrationMissingFinding(this.id, CLAUDE_CONFIG_FILE));
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        findings.push(createInvalidConfigFinding(this.id, CLAUDE_CONFIG_FILE, msg));
      }
    }
    if (!(await pathExists(hookPath))) findings.push(createAssetMissingFinding(this.id, CLAUDE_HOOK_FILE));
    findings.push(...await diagnoseStatusline(context));
    return findings;
  }

  benchmarkFixture(): BenchmarkFixture {
    return {
      harness: this.id,
      executionModel: 'process',
      event: 'PreToolUse',
      targetMilliseconds: 100,
      samplePayload: {
        session_id: 'bench-claude',
        hook_event_name: 'PreToolUse',
        tool_name: 'Bash',
        tool_input: { command: 'ls' },
        tool_use_id: 'toolu_bench',
        cwd: '/repo',
      },
    };
  }
}
