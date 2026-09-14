import { mkdir, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

export const ASSET_ENTRIES = [
  { source: 'assets/runtime/entry.ts', destination: 'dist/assets/runtime/context-brake-runtime.mjs' },
  { source: 'assets/runtime/process-hook.ts', destination: 'dist/assets/runtime/process-hook.mjs' },
  { source: 'assets/runtime/opencode-plugin.ts', destination: 'dist/assets/runtime/opencode-plugin.js' },
  { source: 'assets/runtime/pi-extension.ts', destination: 'dist/assets/runtime/pi-extension.js' },
  { source: 'assets/runtime/omp-extension.ts', destination: 'dist/assets/runtime/omp-extension.js' },
] as const;

export async function buildRuntimeAssets(): Promise<void> {
  await mkdir('dist/assets/runtime', { recursive: true });
  for (const entry of ASSET_ENTRIES) {
    const result = await build({
      entryPoints: [entry.source],
      bundle: true,
      format: 'esm',
      platform: 'node',
      target: 'node20',
      write: false,
      legalComments: 'none',
    });
    await writeFile(entry.destination, result.outputFiles[0]?.text ?? '', 'utf8');
  }
}

await buildRuntimeAssets();
