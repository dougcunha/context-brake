import { readFile, realpath, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import type { HarnessContext } from '../../../core/contracts/adapter.js';
import type { DiagnosticFinding } from '../../../core/contracts/diagnostics.js';
import { resolveChangeTarget } from '../common/change-target.js';
import { NodeProcessRunner } from '../../process/node-process-runner.js';
import { normalizeSeparators } from '../../storage/path-boundary.js';
import { getUserHome } from '../common/path-helpers.js';
import { localStatuslineCommand } from './statusline-context-window.js';
import { CLAUDE_LOCAL_SETTINGS_FILE, CLAUDE_SETTINGS_FILE, firstPreviousStatusline, readSettings, STATUSLINE_BRIDGE_FILE, statuslineOf } from './statusline-settings.js';
import { parseStatuslineState, STATUSLINE_STATE_FILE, type StatuslineState } from './statusline-state.js';

const GIT_TIMEOUT_MILLISECONDS = 2000;
const GIT_NOT_IGNORED_EXIT_CODE = 1;
const BRIDGE_SCRIPT_PATTERN = /^node "([^"]+)"/;
const REINSTALL = 'Run context-brake init --statusline-bridge.';

type FindingText = { readonly code: string; readonly path: string; readonly message: string; readonly impact: string; readonly remediation: string };

const STATE_INVALID: FindingText = { code: 'STATUSLINE_STATE_INVALID', path: STATUSLINE_STATE_FILE, message: `${STATUSLINE_STATE_FILE} does not match the expected format.`, impact: 'Removal cannot restore the previous local status line.', remediation: REINSTALL };
const BRIDGE_INACTIVE: FindingText = { code: 'STATUSLINE_BRIDGE_INACTIVE', path: CLAUDE_LOCAL_SETTINGS_FILE, message: 'The local statusLine no longer runs the ContextBrake bridge.', impact: 'Zones use contextWindowCeiling instead of the model window.', remediation: `${REINSTALL} Use --no-statusline-bridge to forget the bridge instead.` };
const MISSING_SCRIPT: FindingText = { code: 'STATUSLINE_BRIDGE_MISSING_SCRIPT', path: STATUSLINE_BRIDGE_FILE, message: 'The status line command points to a bridge script that does not exist.', impact: 'The status line and the window recording fail until the script is restored.', remediation: REINSTALL };
const PREVIOUS_CHANGED: FindingText = { code: 'STATUSLINE_PREVIOUS_CHANGED', path: CLAUDE_LOCAL_SETTINGS_FILE, message: 'The project or user status line changed after the bridge was installed.', impact: 'The bridge still runs the status line command recorded at install.', remediation: 'Run context-brake init --no-statusline-bridge, then context-brake init --statusline-bridge.' };
function localTracked(path: string): FindingText {
  return { code: 'STATUSLINE_LOCAL_TRACKED', path, message: `${path} is not ignored by Git.`, impact: 'The machine-specific status line command can be committed.', remediation: `Add ${path} to .gitignore.` };
}

export async function diagnoseStatusline(context: HarnessContext): Promise<DiagnosticFinding[]> {
  const raw = await readFile(resolve(context.projectRoot, STATUSLINE_STATE_FILE), 'utf8').catch(() => null);
  if (raw === null) return [];
  const state = parseStatuslineState(raw);
  if (state === null) return [finding(STATE_INVALID)];
  const failed = [
    (await localStatuslineCommand(context.projectRoot)) !== state.installedCommand && BRIDGE_INACTIVE,
    !(await isScriptPresent(state)) && MISSING_SCRIPT,
    (await currentPreviousCommand(context, state)) !== state.previousCommand && PREVIOUS_CHANGED,
    await trackedLocalSettings(context),
  ];
  return failed.filter((text): text is FindingText => text !== false && text !== null).map(finding);
}

async function isScriptPresent(state: StatuslineState): Promise<boolean> {
  const scriptPath = state.installedCommand.match(BRIDGE_SCRIPT_PATTERN)?.[1];
  if (scriptPath === undefined) return false;
  return stat(scriptPath).then(() => true, () => false);
}

async function currentPreviousCommand(context: HarnessContext, state: StatuslineState): Promise<string | null> {
  const project = await readSettings(resolve(context.projectRoot, CLAUDE_SETTINGS_FILE));
  const user = await readSettings(join(getUserHome(context.userHome), CLAUDE_SETTINGS_FILE));
  const previous = firstPreviousStatusline([{ source: 'local', value: state.previousLocal ?? undefined }, { source: 'project', value: statuslineOf(project) }, { source: 'user', value: statuslineOf(user) }]);
  return previous?.command ?? null;
}

async function trackedLocalSettings(context: HarnessContext): Promise<FindingText | null> {
  const runner = context.runner ?? new NodeProcessRunner();
  const paths = await localSettingsPaths(context.projectRoot);
  const results = await Promise.all(paths.map((path) => runner.run({ executable: 'git', args: ['-C', context.projectRoot, 'check-ignore', '-q', path], timeoutMilliseconds: GIT_TIMEOUT_MILLISECONDS })));
  const tracked = paths.filter((_, index) => results[index]?.status !== 'timed_out' && results[index]?.exitCode === GIT_NOT_IGNORED_EXIT_CODE).at(-1);
  return tracked === undefined ? null : localTracked(tracked);
}

async function localSettingsPaths(projectRoot: string): Promise<string[]> {
  const target = await resolveChangeTarget(projectRoot, CLAUDE_LOCAL_SETTINGS_FILE).catch(() => null);
  if (target === null) return [CLAUDE_LOCAL_SETTINGS_FILE];
  const targetPath = normalizeSeparators(relative(await realpath(projectRoot), target));
  return targetPath === CLAUDE_LOCAL_SETTINGS_FILE ? [CLAUDE_LOCAL_SETTINGS_FILE] : [CLAUDE_LOCAL_SETTINGS_FILE, targetPath];
}

function finding(text: FindingText): DiagnosticFinding {
  return { ...text, severity: 'warning', scope: 'harness', harness: 'claude-code' };
}
