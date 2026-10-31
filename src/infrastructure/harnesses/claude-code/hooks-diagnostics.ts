import { resolve } from 'node:path';
import type { HarnessContext } from '../../../core/contracts/adapter.js';
import type { DiagnosticFinding } from '../../../core/contracts/diagnostics.js';
import type { HarnessId } from '../../../core/contracts/harness.js';
import { validateJsonDocument } from '../../storage/json-validator.js';
import { createIntegrationMissingFinding, createInvalidConfigFinding } from '../common/diagnostic-helpers.js';
import { parseHooks } from './claude-hooks-config.js';
import { isTargetGroup } from './claude-merger.js';
import { claudeHooksFile, hasOwnedHooks, ignoresHookScript, readRaw } from './hooks-file.js';
import { CLAUDE_SETTINGS_FILE } from './statusline-settings.js';

export const HOOKS_IN_VERSIONED_SETTINGS = 'HOOKS_IN_VERSIONED_SETTINGS';

function registersPostToolUse(raw: string): boolean {
  const post = parseHooks(raw).PostToolUse;
  return Array.isArray(post) && post.some((group) => isTargetGroup(group, 'PostToolUse'));
}

async function diagnoseTarget(root: string, harness: HarnessId, target: string): Promise<DiagnosticFinding[]> {
  const raw = await readRaw(root, target);
  if (raw === null) return [createIntegrationMissingFinding(harness, target)];
  const validation = validateJsonDocument(raw);
  if (!validation.valid) return [createInvalidConfigFinding(harness, target, validation.errors.join('; '))];
  return registersPostToolUse(raw) ? [] : [createIntegrationMissingFinding(harness, target)];
}

function brokenForClonesFinding(harness: HarnessId, withGitIgnore: boolean): DiagnosticFinding {
  const remediation = withGitIgnore
    ? `Run context-brake init --harness ${harness} --yes to move the hooks to .claude/settings.local.json.`
    : `Run context-brake init --harness ${harness} --no-gitignore --yes, or stop ignoring ${'.claude/hooks/context-brake.mjs'} in .gitignore.`;
  return {
    code: HOOKS_IN_VERSIONED_SETTINGS, severity: 'warning', scope: 'file', harness, path: CLAUDE_SETTINGS_FILE,
    message: `The ${harness} hooks are registered in ${CLAUDE_SETTINGS_FILE}, which Git versions, but the hook script .claude/hooks/context-brake.mjs is ignored by Git.`,
    impact: 'Anyone who clones the repository gets hooks that point to a missing script, and every hook fails with MODULE_NOT_FOUND.',
    remediation,
  };
}

export async function diagnoseHooks(context: HarnessContext, harness: HarnessId): Promise<DiagnosticFinding[]> {
  const root = resolve(context.projectRoot);
  const target = claudeHooksFile(context);
  const findings = await diagnoseTarget(root, harness, target);
  const shared = await readRaw(root, CLAUDE_SETTINGS_FILE);
  const sharedHasHooks = shared !== null && hasOwnedHooks(shared);
  const scriptIgnored = context.gitIgnore === true || await ignoresHookScript(root);
  if (sharedHasHooks && scriptIgnored) findings.push(brokenForClonesFinding(harness, context.gitIgnore === true));
  return findings;
}
