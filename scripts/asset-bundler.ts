import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { build } from 'esbuild';

export type AssetEntry = { readonly source: string; readonly destination: string };

export const ASSET_ENTRIES: readonly AssetEntry[] = [
  { source: 'assets/runtime/entry.ts', destination: 'dist/assets/runtime/context-brake-runtime.mjs' },
  { source: 'assets/runtime/process-hook.ts', destination: 'dist/assets/runtime/process-hook.mjs' },
  { source: 'assets/runtime/opencode-plugin.ts', destination: 'dist/assets/runtime/opencode-plugin.js' },
  { source: 'assets/runtime/pi-extension.ts', destination: 'dist/assets/runtime/pi-extension.js' },
  { source: 'assets/runtime/omp-extension.ts', destination: 'dist/assets/runtime/omp-extension.js' },
];

const BUNDLE_TARGET = 'node20';

export async function bundleAsset(entry: AssetEntry): Promise<string> {
  const result = await build({
    entryPoints: [entry.source],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: BUNDLE_TARGET,
    write: false,
    legalComments: 'none',
  });
  return result.outputFiles[0]?.text ?? '';
}

export async function buildRuntimeAssets(root: string = process.cwd(), entries: readonly AssetEntry[] = ASSET_ENTRIES): Promise<void> {
  for (const entry of entries) {
    const destination = resolve(root, entry.destination);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, await bundleAsset(entry), 'utf8');
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
    if (actual !== (await bundleAsset(entry))) stale.push(entry.destination);
  }
  return stale;
}

export async function verifyAssets(root: string = process.cwd()): Promise<void> {
  const stale = await findStaleAssets(root);
  if (stale.length === 0) return;
  throw new Error(`Built runtime assets are stale: ${stale.join(', ')}. Run npm run build.`);
}
