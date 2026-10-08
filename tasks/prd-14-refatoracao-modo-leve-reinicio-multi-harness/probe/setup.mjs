import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Usage: node setup.mjs <probe-project-dir>');

const bundles = [
  ['pi-probe.js', '.pi/extensions/context-brake-probe.js'],
  ['omp-probe.js', '.omp/extensions/context-brake-probe.js'],
  ['opencode-v2-server.js', '.opencode/plugins/context-brake-probe.js'],
  ['opencode-v2-tui.js', '.opencode/cb-probe-tui/tui.js'],
];

for (const [entry, out] of bundles) {
  const outfile = join(target, out);
  await mkdir(dirname(outfile), { recursive: true });
  await build({ entryPoints: [join(here, entry)], outfile, bundle: true, format: 'esm', platform: 'node', target: 'node20', logLevel: 'warning', define: { __PROBE_ROOT__: JSON.stringify(target) } });
}
await writeFile(join(target, '.opencode', 'cli.json'), `${JSON.stringify({ $schema: 'https://opencode.ai/v2/cli.json', plugins: ['./cb-probe-tui'] }, null, 2)}\n`, 'utf8');
await writeFile(join(target, 'README.txt'), 'ContextBrake probe project (prd-14 T01). Captures land in probe-captures/.\n', 'utf8');
console.log(`Probe project ready at ${target}`);
