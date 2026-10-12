import semver from 'semver';
import type { HarnessContext, StatuslineBridgeRequest } from '../../../core/contracts/adapter.js';
import type { VersionProbe } from '../../../core/contracts/harness.js';
import { NodeProcessRunner } from '../../process/node-process-runner.js';
import { probeExecutableVersion } from '../common/version-probes.js';
import { MODS_MINIMUM_CLAUDE_VERSION } from './auto-restart-diagnostics.js';
import { CLAUDE_EXECUTABLES } from './detector.js';

export const CONTEXT_MOD_MINIMUM_CLAUDE_VERSION = MODS_MINIMUM_CLAUDE_VERSION;

export type ContextSource = 'mod' | 'bridge';
export type ContextSourceInput = { readonly request: StatuslineBridgeRequest; readonly version: VersionProbe };

export function decideContextSource(input: ContextSourceInput): ContextSource {
  if (input.request === 'install') return 'bridge';
  const version = input.version.normalized;
  return version !== null && semver.gte(version, CONTEXT_MOD_MINIMUM_CLAUDE_VERSION) ? 'mod' : 'bridge';
}

export async function detectContextSource(context: HarnessContext): Promise<ContextSource> {
  const version = await probeExecutableVersion(context.runner ?? new NodeProcessRunner(), CLAUDE_EXECUTABLES);
  return decideContextSource({ request: context.statuslineBridge ?? 'default', version });
}
