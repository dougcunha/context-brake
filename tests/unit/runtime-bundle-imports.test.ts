import { describe, expect, it } from 'vitest';
import { build, type Metafile } from 'esbuild';
import { ASSET_ENTRIES, bundleAsset } from '../../scripts/asset-bundler.js';

const CHILD_PROCESS_SPEC = ['node:', 'child_process'].join('');
const CLI_SPEC = ['./src', 'cli', 'commands', 'doctor.js'].join('/');

const FORBIDDEN_RULES = [
  { rule: 'classic zod', check: (p: string) => (p.includes('node_modules/zod') || p.includes('node_modules\\zod')) && (p.includes('/classic/') || p.includes('\\classic\\') || p.endsWith('/zod/index.js') || p.endsWith('\\zod\\index.js')) || p === 'zod' },
  { rule: 'jsonc-parser', check: (p: string) => p.includes('jsonc-parser') },
  { rule: 'semver', check: (p: string) => p.includes('semver') },
  { rule: 'src/cli/', check: (p: string) => p.includes('src/cli/') || p.includes('src\\cli\\') },
] as const;

export function findForbiddenImports(metafile: Metafile): string[] {
  const targets = new Set<string>([
    ...Object.keys(metafile.inputs),
    ...Object.values(metafile.inputs).flatMap((input) => input.imports.map((item) => item.path)),
  ]);
  const violations: string[] = [];
  for (const target of targets) {
    for (const { rule, check } of FORBIDDEN_RULES) {
      if (check(target)) violations.push(`${rule}:${target}`);
    }
  }
  for (const [source, input] of Object.entries(metafile.inputs)) {
    for (const imported of input.imports) {
      if (!imported.path.includes('child_process')) continue;
      if (/src[/\\]infrastructure[/\\]process[/\\](node-process-runner|process-tree)\.ts$/.test(source)) continue;
      violations.push(`child_process:${source}:${imported.path}`);
    }
  }
  return violations;
}

async function bundleSnippet(snippet: string): Promise<Metafile> {
  const result = await build({
    stdin: { contents: snippet, resolveDir: process.cwd(), loader: 'ts' },
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    write: false,
    metafile: true,
  });
  return result.metafile ?? { inputs: {}, outputs: {} };
}

describe('runtime bundle import guard (TC-24, QA-08, DEC-02)', () => {
  it.each(ASSET_ENTRIES)('guarantees $destination has no forbidden imports', async (entry) => {
    const { metafile } = await bundleAsset(entry);
    expect(findForbiddenImports(metafile)).toEqual([]);
  });

  it.each([
    ['classic zod', "import { z } from 'zod'; void z;"],
    ['jsonc-parser', "import { parse } from 'jsonc-parser'; void parse;"],
    ['semver', "import semver from 'semver'; void semver;"],
    ['child_process', `import { exec } from '${CHILD_PROCESS_SPEC}'; void exec;`],
    ['src/cli/', `import { runDoctor } from '${CLI_SPEC}'; void runDoctor;`],
  ])('fails when a fixture imports %s', async (forbidden, snippet) => {
    const metafile = await bundleSnippet(snippet);
    const violations = findForbiddenImports(metafile);
    expect(violations.some((v) => v.startsWith(forbidden))).toBe(true);
  });
});
