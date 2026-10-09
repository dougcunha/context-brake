import type { FileSnapshot } from '../core/contracts/changes.js';
import { MANIFEST_RELATIVE_PATH } from '../core/contracts/manifest.js';
import { RESTART_LOG_RELATIVE_DIR } from '../core/contracts/restart-log.js';
import { GITIGNORE_PATH } from '../core/services/gitignore-plan.js';
import { MOD_FILES } from '../infrastructure/harnesses/claude-code/auto-restart-files.js';
import { snapshotFiles } from '../infrastructure/storage/node-file-system.js';
import { listRuntimeStateFiles } from '../infrastructure/storage/runtime-state-files.js';

const STANDARD_HARNESS_PATHS = [
  '.claude/settings.json', '.claude/settings.local.json', '.claude/hooks/context-brake.mjs', '.claude/hooks/context-brake-statusline.mjs',
  '.context-brake/runtime/claude-statusline.json', '.context-brake/runtime/claude-statusline-opt-out.json', '.context-brake/runtime/claude-mod-install.json',
  '.codex/hooks.json', '.codex/config.toml', '.codex/hooks/context-brake.mjs',
  '.cursor/hooks.json', '.cursor/hooks/context-brake.mjs',
  '.github/copilot/settings.json', '.github/hooks/context-brake.json', '.github/hooks/context-brake.mjs',
  'opencode.json', 'opencode.jsonc', '.opencode/plugins/context-brake.js',
  '.pi/settings.json', '.pi/extensions/context-brake.js', '.pi/extensions/context-brake-restart.js',
  '.omp/settings.json', '.omp/config.yml', '.omp/extensions/context-brake.js', '.omp/extensions/context-brake-restart.js', '.context-brake/.gitignore',
  '.agents/hooks.json', '.agents/hooks/context-brake.mjs',
  ...MOD_FILES,
] as const;

export async function collectProjectSnapshots(root: string): Promise<FileSnapshot[]> {
  return snapshotFiles(root, ['context-brake.config.json', MANIFEST_RELATIVE_PATH, GITIGNORE_PATH, ...STANDARD_HARNESS_PATHS]);
}

export async function collectRestartLogSnapshots(root: string): Promise<FileSnapshot[]> {
  const paths = (await listRuntimeStateFiles(root)).filter((path) => path.startsWith(`${RESTART_LOG_RELATIVE_DIR}/`));
  return paths.length > 0 ? snapshotFiles(root, paths) : [];
}
