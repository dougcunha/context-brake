import type { AdapterDescriptor, HarnessAdapter } from '../../core/contracts/adapter.js';
import type { HarnessId } from '../../core/contracts/harness.js';
import { AntigravityAdapter } from './antigravity-cli/adapter.js';
import { ANTIGRAVITY_EXECUTABLES, ANTIGRAVITY_USER_FILES } from './antigravity-cli/detector.js';
import { ClaudeAdapter } from './claude-code/adapter.js';
import { CLAUDE_EXECUTABLES, CLAUDE_PROJECT_FILES, CLAUDE_USER_FILES } from './claude-code/detector.js';
import { CodexAdapter } from './codex-cli/adapter.js';
import { CODEX_EXECUTABLES, CODEX_PROJECT_FILES, CODEX_USER_FILES } from './codex-cli/detector.js';
import { CursorAdapter } from './cursor/adapter.js';
import { CURSOR_EXECUTABLES, CURSOR_PROJECT_FILES, CURSOR_USER_FILES } from './cursor/detector.js';
import { CopilotAdapter } from './github-copilot-cli/adapter.js';
import { COPILOT_EXECUTABLES, COPILOT_PROJECT_FILES, COPILOT_USER_FILES } from './github-copilot-cli/detector.js';
import { OhMyPiAdapter } from './oh-my-pi/adapter.js';
import { OMP_EXECUTABLES, OMP_PROJECT_FILES, OMP_USER_FILES } from './oh-my-pi/detector.js';
import { OpenCodeAdapter } from './opencode/adapter.js';
import { OPENCODE_EXECUTABLES, OPENCODE_PROJECT_FILES, OPENCODE_USER_FILES } from './opencode/detector.js';
import { PiAdapter } from './pi/adapter.js';
import { PI_EXECUTABLES, PI_PROJECT_FILES, PI_USER_FILES } from './pi/detector.js';

export const ADAPTER_DESCRIPTORS: readonly AdapterDescriptor[] = [
  {
    id: 'claude-code',
    executionModel: 'process',
    strongProjectFiles: CLAUDE_PROJECT_FILES,
    machineExecutables: CLAUDE_EXECUTABLES,
    userConfigFiles: CLAUDE_USER_FILES,
    createAdapter: () => new ClaudeAdapter(),
  },
  {
    id: 'codex-cli',
    executionModel: 'process',
    strongProjectFiles: CODEX_PROJECT_FILES,
    machineExecutables: CODEX_EXECUTABLES,
    userConfigFiles: CODEX_USER_FILES,
    createAdapter: () => new CodexAdapter(),
  },
  {
    id: 'cursor',
    executionModel: 'process',
    strongProjectFiles: CURSOR_PROJECT_FILES,
    machineExecutables: CURSOR_EXECUTABLES,
    userConfigFiles: CURSOR_USER_FILES,
    createAdapter: () => new CursorAdapter(),
  },
  {
    id: 'github-copilot-cli',
    executionModel: 'process',
    strongProjectFiles: COPILOT_PROJECT_FILES,
    machineExecutables: COPILOT_EXECUTABLES,
    userConfigFiles: COPILOT_USER_FILES,
    createAdapter: () => new CopilotAdapter(),
  },
  {
    id: 'antigravity-cli',
    executionModel: 'process',
    strongProjectFiles: ['.agents/hooks.json'],
    machineExecutables: ANTIGRAVITY_EXECUTABLES,
    userConfigFiles: ANTIGRAVITY_USER_FILES,
    createAdapter: () => new AntigravityAdapter(),
  },
  {
    id: 'opencode',
    executionModel: 'in_process',
    strongProjectFiles: OPENCODE_PROJECT_FILES,
    machineExecutables: OPENCODE_EXECUTABLES,
    userConfigFiles: OPENCODE_USER_FILES,
    createAdapter: () => new OpenCodeAdapter(),
  },
  {
    id: 'pi',
    executionModel: 'in_process',
    strongProjectFiles: PI_PROJECT_FILES,
    machineExecutables: PI_EXECUTABLES,
    userConfigFiles: PI_USER_FILES,
    createAdapter: () => new PiAdapter(),
  },
  {
    id: 'oh-my-pi',
    executionModel: 'in_process',
    strongProjectFiles: OMP_PROJECT_FILES,
    machineExecutables: OMP_EXECUTABLES,
    userConfigFiles: OMP_USER_FILES,
    createAdapter: () => new OhMyPiAdapter(),
  },
] as const;

export function getDescriptor(id: HarnessId): AdapterDescriptor {
  const desc = ADAPTER_DESCRIPTORS.find((d) => d.id === id);
  if (!desc) throw new Error(`Unknown harness: ${id}`);
  return desc;
}

export function getAdapter(id: HarnessId): HarnessAdapter {
  return getDescriptor(id).createAdapter();
}

export function getAllAdapters(): readonly HarnessAdapter[] {
  return ADAPTER_DESCRIPTORS.map((d) => d.createAdapter());
}
