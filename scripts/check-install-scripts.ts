import { readFile } from 'node:fs/promises';

type LockPackage = { dependencies?: Record<string, string>; hasInstallScript?: boolean };
type LockFile = { packages: Record<string, LockPackage> };
type PackageManifest = { dependencies?: Record<string, string> };
const lock = JSON.parse(await readFile('package-lock.json', 'utf8')) as LockFile;
const manifest = JSON.parse(await readFile('package.json', 'utf8')) as PackageManifest;
const queue = Object.keys(manifest.dependencies ?? {}).map((name) => ({ from: '', name }));
const visited = new Set<string>();
while (queue.length > 0) { const item = queue.shift(); if (!item) continue; const path = findPackagePath(item.from, item.name); if (visited.has(path)) continue; visited.add(path); const dependency = lock.packages[path]; if (!dependency) throw new Error(`Missing runtime dependency in lockfile: ${path}`); if (dependency.hasInstallScript) throw new Error(`Runtime dependency has an install script: ${path}`); for (const name of Object.keys(dependency.dependencies ?? {})) queue.push({ from: path, name }); }
function findPackagePath(from: string, name: string): string {
  const parts = from.split('/').filter(Boolean);
  for (let index = parts.length; index >= 0; index -= 1) { const prefix = parts.slice(0, index).join('/'); const candidate = `${prefix ? `${prefix}/` : ''}node_modules/${name}`; if (lock.packages[candidate]) return candidate; }
  throw new Error(`Missing runtime dependency in lockfile: ${name} from ${from || 'root'}`);
}
process.stdout.write(`Checked ${visited.size} runtime dependency package(s); no install scripts found.\n`);
