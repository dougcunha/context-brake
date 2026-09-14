import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));

export async function loadRuntimeAsset(assetName: string): Promise<string> {
  const candidates = [
    resolve(currentDir, '../../../../dist/assets/runtime', assetName),
    resolve(currentDir, '../../assets/runtime', assetName),
    resolve(currentDir, '../../../../assets/runtime', assetName),
    resolve(process.cwd(), 'dist/assets/runtime', assetName),
    resolve(process.cwd(), 'assets/runtime', assetName),
  ];
  for (const candidate of candidates) {
    try {
      return await readFile(candidate, 'utf8');
    } catch {
      // Continue to next candidate location
    }
  }
  throw new Error(`Unable to locate runtime asset: ${assetName}`);
}
