import type { ContextBrakeConfig } from '../core/contracts/configuration.js';
import type { FileSnapshot } from '../core/contracts/changes.js';
import { MANIFEST_RELATIVE_PATH } from '../core/contracts/manifest.js';
import { snapshotFiles } from '../infrastructure/storage/node-file-system.js';

const STANDARD_HARNESS_PATHS = [
  '.claude/settings.json', '.claude/settings.local.json', '.claude/hooks/context-brake.mjs', '.claude/hooks/context-brake-statusline.mjs',
  '.context-brake/runtime/claude-statusline.json',
  '.codex/hooks.json', '.codex/config.toml', '.codex/hooks/context-brake.mjs',
  '.cursor/hooks.json', '.cursor/hooks/context-brake.mjs',
  '.github/copilot/settings.json', '.github/hooks/context-brake.json', '.github/hooks/context-brake.mjs',
  'opencode.json', 'opencode.jsonc', '.opencode/plugins/context-brake.js',
  '.pi/settings.json', '.pi/extensions/context-brake.js',
  '.omp/settings.json', '.omp/config.yml', '.omp/extensions/context-brake.js',
  '.agents/hooks.json', '.agents/hooks/context-brake.mjs',
] as const;

export async function collectProjectSnapshots(root: string, config: ContextBrakeConfig | null, extraTargets: readonly string[] = []): Promise<FileSnapshot[]> {
  const protocol = config?.instructionFiles.protocolFile ?? 'docs/context-brake-protocol.md';
  const plan = config?.stateStorage.planFile ?? 'task_plan.json';
  const checkpoint = config?.stateStorage.checkpointFile ?? 'state_checkpoint.json';
  const instTargets = config?.instructionFiles.targets ?? ['CLAUDE.md', 'AGENTS.md'];
  const paths = Array.from(new Set([
    'context-brake.config.json',
    '.gitignore',
    MANIFEST_RELATIVE_PATH,
    protocol,
    plan,
    checkpoint,
    ...instTargets,
    ...extraTargets,
    ...STANDARD_HARNESS_PATHS,
  ]));
  return snapshotFiles(root, paths);
}
