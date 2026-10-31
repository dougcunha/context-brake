import { resolve } from 'node:path';
import type { BenchmarkFixture, HarnessAdapter, HarnessContext } from '../../../core/contracts/adapter.js';
import type { DiagnosticFinding } from '../../../core/contracts/diagnostics.js';
import { type CapabilityProfile, type DetectionEvidence, type VersionProbe } from '../../../core/contracts/harness.js';
import { deriveSupportProfile } from '../../../core/services/support-service.js';
import { createAssetMissingFinding } from '../common/diagnostic-helpers.js';
import { attachConfigOrigin } from '../common/config-origin.js';
import { pathExists } from '../common/path-helpers.js';
import { probeExecutableVersion } from '../common/version-probes.js';
import { diagnoseAutoRestart } from './auto-restart-diagnostics.js';
import { CLAUDE_CAPABILITIES, CLAUDE_MINIMUM_VERSION } from './capabilities.js';
import { detectContextSource } from './context-source.js';
import { CLAUDE_EXECUTABLES, detectClaude } from './detector.js';
import { CLAUDE_FIX_GROUPS } from './fix-groups.js';
import { claudeHooksFile } from './hooks-file.js';
import { diagnoseHooks } from './hooks-diagnostics.js';
import { CLAUDE_HOOK_FILE, planClaudeInstall, planClaudeRemove } from './planner.js';
import { diagnoseStatusline } from './statusline-diagnostics.js';

export class ClaudeAdapter implements HarnessAdapter {
  readonly id = 'claude-code';
  readonly executionModel = 'process' as const;
  readonly fixGroups = CLAUDE_FIX_GROUPS;

  capabilityProfile(version?: VersionProbe): CapabilityProfile {
    return deriveSupportProfile({ harness: this.id, capabilities: CLAUDE_CAPABILITIES, version });
  }

  detect(context: HarnessContext): Promise<readonly DetectionEvidence[]> {
    return detectClaude(context.projectRoot, context.userHome);
  }

  probeVersion(context: HarnessContext): Promise<VersionProbe> {
    return probeExecutableVersion(context.runner, CLAUDE_EXECUTABLES, CLAUDE_MINIMUM_VERSION);
  }

  async planInstall(context: HarnessContext) {
    return attachConfigOrigin(await planClaudeInstall(context, await detectContextSource(context)), { path: claudeHooksFile(context), manifest: context.manifest });
  }

  planRemove(context: HarnessContext) {
    return planClaudeRemove(context.projectRoot, context.manifest ?? null);
  }

  async diagnose(context: HarnessContext): Promise<readonly DiagnosticFinding[]> {
    const findings: DiagnosticFinding[] = [...await diagnoseHooks(context, this.id)];
    const hookPath = resolve(context.projectRoot, CLAUDE_HOOK_FILE);
    if (!(await pathExists(hookPath))) findings.push(createAssetMissingFinding(this.id, CLAUDE_HOOK_FILE));
    findings.push(...await diagnoseStatusline(context));
    const wanted = context.autoRestart === true;
    findings.push(...await diagnoseAutoRestart({ projectRoot: context.projectRoot, wanted, version: wanted ? await this.probeVersion(context) : null }));
    return findings;
  }
  benchmarkFixture(): BenchmarkFixture {
    return {
      harness: this.id,
      executionModel: 'process',
      event: 'PostToolUse',
      targetMilliseconds: 100,
      samplePayload: {
        session_id: 'bench-claude',
        hook_event_name: 'PostToolUse',
        tool_name: 'Bash',
        tool_input: { command: 'ls' },
        tool_response: 'file.txt',
        tool_use_id: 'toolu_bench',
        cwd: '/repo',
      },
    };
  }
}
