import type { FileSnapshot } from '../core/contracts/changes.js';
import { MANIFEST_RELATIVE_PATH } from '../core/contracts/manifest.js';
import { MOD_FILES } from '../infrastructure/harnesses/claude-code/auto-restart-files.js';
import { snapshotFiles } from '../infrastructure/storage/node-file-system.js';

const STANDARD_HARNESS_PATHS = [
  '.claude/settings.json', '.claude/settings.local.json', '.claude/hooks/context-brake.mjs', '.claude/hooks/context-brake-statusline.mjs',
  '.context-brake/runtime/claude-statusline.json', '.context-brake/runtime/claude-statusline-opt-out.json', '.context-brake/runtime/claude-mod-install.json',
  '.codex/hooks.json', '.codex/config.toml', '.codex/hooks/context-brake.mjs',
  '.cursor/hooks.json', '.cursor/hooks/context-brake.mjs',
  '.github/copilot/settings.json', '.github/hooks/context-brake.json', '.github/hooks/context-brake.mjs',
  'opencode.json', 'opencode.jsonc', '.opencode/plugins/context-brake.js',
  '.pi/settings.json', '.pi/extensions/context-brake.js',
  '.omp/settings.json', '.omp/config.yml', '.omp/extensions/context-brake.js',
  '.agents/hooks.json', '.agents/hooks/context-brake.mjs',
  ...MOD_FILES,
] as const;

export async function collectProjectSnapshots(root: string): Promise<FileSnapshot[]> {
  return snapshotFiles(root, ['context-brake.config.json', MANIFEST_RELATIVE_PATH, ...STANDARD_HARNESS_PATHS]);
}
