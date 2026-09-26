import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { build, type Metafile } from 'esbuild';

export type AssetEntry = { readonly source: string; readonly destination: string };
export type BundledAsset = { readonly text: string; readonly metafile: Metafile };

export const ASSET_ENTRIES: readonly AssetEntry[] = [
  { source: 'assets/runtime/entry.ts', destination: 'dist/assets/runtime/context-brake-runtime.mjs' },
  { source: 'assets/runtime/claude-code-hook.ts', destination: 'dist/assets/runtime/claude-code-hook.mjs' },
  { source: 'assets/runtime/claude-code-statusline.ts', destination: 'dist/assets/runtime/claude-code-statusline.mjs' },
  { source: 'assets/runtime/codex-cli-hook.ts', destination: 'dist/assets/runtime/codex-cli-hook.mjs' },
  { source: 'assets/runtime/cursor-hook.ts', destination: 'dist/assets/runtime/cursor-hook.mjs' },
  { source: 'assets/runtime/github-copilot-cli-hook.ts', destination: 'dist/assets/runtime/github-copilot-cli-hook.mjs' },
  { source: 'assets/runtime/antigravity-cli-hook.ts', destination: 'dist/assets/runtime/antigravity-cli-hook.mjs' },
  { source: 'assets/runtime/opencode-plugin.ts', destination: 'dist/assets/runtime/opencode-plugin.js' },
  { source: 'assets/runtime/pi-extension.ts', destination: 'dist/assets/runtime/pi-extension.js' },
  { source: 'assets/runtime/omp-extension.ts', destination: 'dist/assets/runtime/omp-extension.js' },
];

const BUNDLE_TARGET = 'node20';

export async function bundleAsset(entry: AssetEntry): Promise<BundledAsset> {
  const result = await build({
    entryPoints: [entry.source],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: BUNDLE_TARGET,
    write: false,
    legalComments: 'none',
    metafile: true,
  });
  return {
    text: result.outputFiles[0]?.text ?? '',
    metafile: result.metafile ?? { inputs: {}, outputs: {} },
  };
}

export async function buildRuntimeAssets(root: string = process.cwd(), entries: readonly AssetEntry[] = ASSET_ENTRIES): Promise<void> {
  for (const entry of entries) {
    const destination = resolve(root, entry.destination);
    await mkdir(dirname(destination), { recursive: true });
    const bundled = await bundleAsset(entry);
    await writeFile(destination, bundled.text, 'utf8');
  }
}

async function readBuiltAsset(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function findStaleAssets(root: string = process.cwd(), entries: readonly AssetEntry[] = ASSET_ENTRIES): Promise<string[]> {
  const stale: string[] = [];
  for (const entry of entries) {
    const actual = await readBuiltAsset(resolve(root, entry.destination));
    const bundled = await bundleAsset(entry);
    if (actual !== bundled.text) stale.push(entry.destination);
  }
  return stale;
}

export async function verifyAssets(root: string = process.cwd()): Promise<void> {
  const stale = await findStaleAssets(root);
  if (stale.length === 0) return;
  throw new Error(`Built runtime assets are stale: ${stale.join(', ')}. Run npm run build.`);
}
