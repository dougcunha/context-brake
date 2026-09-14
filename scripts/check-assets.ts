import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { ASSET_ENTRIES } from './build-assets.js';

export async function verifyAssets(): Promise<void> {
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
    const expected = result.outputFiles[0]?.text ?? '';
    const actual = await readFile(entry.destination, 'utf8');
    if (actual !== expected) {
      throw new Error(`Built runtime asset ${entry.destination} is stale. Run npm run build.`);
    }
  }
}

await verifyAssets();
